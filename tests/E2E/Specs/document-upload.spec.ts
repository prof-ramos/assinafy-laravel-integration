import { test, expect } from '@playwright/test';
import { DocumentsPage, type DocumentFormData } from '../Pages';
import { mockAssinafyApi, createPdfUploadData, SAMPLE_PDF_BASE64 } from '../Helpers';

/**
 * E2E Tests: Document Upload
 *
 * Test suite covering document upload functionality:
 * - Uploading PDF documents
 * - Document metadata processing
 * - Error handling for invalid files
 * - Upload progress tracking
 * - Multiple document uploads
 */
test.describe('Document Upload', () => {
    let documentsPage: DocumentsPage;

    test.beforeEach(async ({ page }) => {
        documentsPage = new DocumentsPage(page);
        await mockAssinafyApi(page);
    });

    /**
     * =========================================================================
     * HAPPY PATHS
     * =========================================================================
     */
    test.describe('Happy Paths', () => {
        test('should upload document successfully', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.assertIsLoaded();

            const documentData: DocumentFormData = {
                title: 'Contrato de Prestação de Serviços',
                description: 'Contrato para teste E2E',
            };

            await test.step('Open upload modal', async () => {
                await documentsPage.clickUpload();
                await documentsPage.assertUploadModalVisible();
            });

            await test.step('Fill document form', async () => {
                await documentsPage.fillDocumentForm(documentData);
                await expect(documentsPage.titleInput).toHaveValue(documentData.title);
            });

            await test.step('Select PDF file', async () => {
                const pdfData = createPdfUploadData('contrato.pdf');
                await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64, 'contrato.pdf');
                await expect(documentsPage.uploadFileName).toBeVisible();
            });

            await test.step('Submit upload', async () => {
                await documentsPage.submitUpload();
                await documentsPage.assertSuccess('enviado com sucesso');
                await documentsPage.assertDocumentVisible(documentData.title);
            });
        });

        test('should upload document with processo and oficio IDs', async ({ page }) => {
            await documentsPage.goto();

            const documentData: DocumentFormData = {
                title: 'Ofício 123/2024',
                description: 'Documento oficial',
                processoId: 'PROC-2024-001',
                oficioId: 'OF-2024-123',
            };

            await documentsPage.uploadDocument(documentData, 'dummy.pdf');
            await documentsPage.assertDocumentVisible(documentData.title);
        });

        test('should show upload progress', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Mock slow upload
            await page.route('**/api/documents/upload', async (route) => {
                await page.waitForTimeout(1000);
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        document_id: 'doc_1',
                        status: 'uploading',
                    }),
                });
            });

            await documentsPage.fillDocumentForm({ title: 'Progress Test' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);

            const submitPromise = documentsPage.submitUpload();

            // Check progress bar appears
            await expect(documentsPage.uploadProgressBar).toBeVisible();

            await submitPromise;
        });

        test('should display document in list after upload', async ({ page }) => {
            await documentsPage.goto();

            const documentData: DocumentFormData = {
                title: 'List Display Test',
            };

            await documentsPage.uploadDocument(documentData, 'dummy.pdf');

            // Verify document appears in list with correct info
            await documentsPage.assertDocumentVisible(documentData.title);
            await expect(
                documentsPage.documentsGrid.getByTestId('document-card-doc_1')
            ).toBeVisible();
        });

        test('should allow multiple uploads in sequence', async ({ page }) => {
            await documentsPage.goto();

            const documents = [
                { title: 'Documento 1' },
                { title: 'Documento 2' },
                { title: 'Documento 3' },
            ];

            for (const doc of documents) {
                await documentsPage.uploadDocument(doc, 'dummy.pdf');
            }

            // Verify all documents are visible
            await expect.poll(async () => await documentsPage.getVisibleDocumentCount()).toBe(3);
        });

        test('should store document metadata correctly', async ({ page }) => {
            await documentsPage.goto();

            const documentData: DocumentFormData = {
                title: 'Metadata Test',
                description: 'Testing metadata storage',
                processoId: 'PROC-001',
                oficioId: 'OF-123',
            };

            await documentsPage.uploadDocument(documentData, 'dummy.pdf');

            // Click on document to view details
            await documentsPage.clickDocument(documentData.title);

            // Verify metadata in detail view
            await expect(page.getByText(documentData.title)).toBeVisible();
            await expect(page.getByText(documentData.processoId!)).toBeVisible();
            await expect(page.getByText(documentData.oficioId!)).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * FILE VALIDATION
     * =========================================================================
     */
    test.describe('File Validation', () => {
        test('should reject non-PDF files', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Try to upload a text file
            const txtFile = Buffer.from('Not a PDF', 'utf-8');
            await documentsPage.fileInput.setInputFiles({
                name: 'document.txt',
                mimeType: 'text/plain',
                buffer: txtFile,
            });

            await documentsPage.submitUpload();

            // Verify error message
            await expect(
                page.getByText(/apenas PDF|only PDF|formato inválido/i)
            ).toBeVisible();
        });

        test('should reject oversized files', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Create a file larger than 10MB
            const largeFile = Buffer.alloc(11 * 1024 * 1024); // 11MB
            await documentsPage.fileInput.setInputFiles({
                name: 'large.pdf',
                mimeType: 'application/pdf',
                buffer: largeFile,
            });

            await documentsPage.submitUpload();

            // Verify size error
            await expect(
                page.getByText(/muito grande|too large|tamanho máximo/i)
            ).toBeVisible();
        });

        test('should reject password-protected PDFs', async ({ page }) => {
            // Mock API response for protected PDF
            await page.route('**/api/documents/upload', (route) => {
                route.fulfill({
                    status: 400,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'PDF is password protected',
                        message: 'O PDF está protegido com senha',
                    }),
                });
            });

            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Protected PDF' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);
            await documentsPage.submitUpload();

            // Verify error
            await expect(
                page.getByText(/protegido com senha|password protected/i)
            ).toBeVisible();
        });

        test('should reject corrupted PDF files', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Upload invalid PDF content
            const invalidPdf = Buffer.from('Not a valid PDF content here');
            await documentsPage.fileInput.setInputFiles({
                name: 'corrupted.pdf',
                mimeType: 'application/pdf',
                buffer: invalidPdf,
            });

            await documentsPage.submitUpload();

            // Verify error
            await expect(
                page.getByText(/inválido|corrompido|invalid/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * FORM VALIDATION
     * =========================================================================
     */
    test.describe('Form Validation', () => {
        test('should require title field', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Try to submit without title
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);
            await documentsPage.submitUpload();

            // Verify validation error
            await expect(
                page.getByText(/título é obrigatório|title required/i)
            ).toBeVisible();
        });

        test('should validate title length', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Title too long (> 255 chars)
            const longTitle = 'A'.repeat(256);
            await documentsPage.titleInput.fill(longTitle);

            await expect(
                page.getByText(/muito longo|too long|máximo.*caracteres/i)
            ).toBeVisible();
        });

        test('should validate processo ID format', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Invalid processo format
            await documentsPage.processoIdInput.fill('INVALID-FORMAT');
            await documentsPage.processoIdInput.blur();

            await expect(
                page.getByText(/formato inválido|invalid format/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ERROR HANDLING
     * =========================================================================
     */
    test.describe('Error Handling', () => {
        test('should handle upload failure gracefully', async ({ page }) => {
            // Mock upload failure
            await page.route('**/api/documents/upload', (route) => {
                route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        error: 'Upload failed',
                        message: 'Erro ao fazer upload do arquivo',
                    }),
                });
            });

            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Fail Test' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);
            await documentsPage.submitUpload();

            // Verify error displayed and modal stays open
            await expect(
                page.getByText(/erro ao fazer upload|upload failed/i)
            ).toBeVisible();
            await expect(documentsPage.uploadModal).toBeVisible();
        });

        test('should handle network timeout', async ({ page }) => {
            // Mock timeout
            await page.route('**/api/documents/upload', () => {
                // Never respond
            });

            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Timeout Test' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);
            await documentsPage.submitUpload();

            // Verify timeout error
            await expect(
                page.getByText(/tempo esgotado|timeout|erro de rede/i)
            ).toBeVisible({ timeout: 35000 });
        });

        test('should allow retry after failure', async ({ page }) => {
            let attemptCount = 0;

            // Mock first attempt fails, second succeeds
            await page.route('**/api/documents/upload', (route) => {
                attemptCount++;
                if (attemptCount === 1) {
                    route.fulfill({
                        status: 500,
                        contentType: 'application/json',
                        body: JSON.stringify({ error: 'Server error' }),
                    });
                } else {
                    route.fulfill({
                        status: 200,
                        contentType: 'application/json',
                        body: JSON.stringify({
                            document_id: 'doc_retry',
                            status: 'uploaded',
                        }),
                    });
                }
            });

            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Retry Test' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);

            // First attempt fails
            await documentsPage.submitUpload();
            await expect(page.getByText(/server error|erro/i)).toBeVisible();

            // Retry
            await documentsPage.submitUpload();

            // Should succeed
            await expect(page.getByText(/sucesso|success/i)).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * DRAG AND DROP
     * =========================================================================
     */
    test.describe('Drag and Drop', () => {
        test('should accept file via drag and drop', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            // Get drop zone
            const dropZone = documentsPage.fileDropZone;

            // Simulate drag and drop
            const dataTransfer = await page.evaluateHandle(() => {
                const dt = new DataTransfer();
                const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
                dt.items.add(file);
                return dt;
            });

            await dropZone.dispatchEvent('drop', { dataTransfer });

            // Verify file selected
            await expect(documentsPage.uploadFileName).toBeVisible();
        });

        test('should highlight drop zone on dragover', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            const dropZone = documentsPage.fileDropZone;

            // Simulate dragover
            await dropZone.dispatchEvent('dragenter');

            // Verify visual feedback
            await expect(dropZone).toHaveClass(/drag-over|highlight/);
        });
    });

    /**
     * =========================================================================
     * CANCEL AND CLOSE
     * =========================================================================
     */
    test.describe('Cancel and Close', () => {
        test('should close upload modal without changes', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Cancel Test' });
            await documentsPage.cancelUpload();

            // Verify modal closed and no document created
            await expect(documentsPage.uploadModal).not.toBeVisible();
            await documentsPage.assertNoDocuments();
        });

        test('should prompt for confirmation when closing with data', async ({ page }) => {
            await documentsPage.goto();
            await documentsPage.clickUpload();

            await documentsPage.fillDocumentForm({ title: 'Unsaved Changes' });
            await documentsPage.uploadPdfFromBase64(SAMPLE_PDF_BASE64);

            // Try to close
            await documentsPage.closeButton.click();

            // Verify confirmation dialog
            await expect(
                page.getByText(/descartar alterações|discard changes|tem certeza/i)
            ).toBeVisible();
        });

        test('should reset form after successful upload', async ({ page }) => {
            await documentsPage.goto();

            // Upload first document
            await documentsPage.uploadDocument({ title: 'First' }, 'dummy.pdf');

            // Open upload modal again
            await documentsPage.clickUpload();

            // Verify form is empty
            await expect(documentsPage.titleInput).toHaveValue('');
            await expect(documentsPage.descriptionInput).toHaveValue('');
        });
    });
});
