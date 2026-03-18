import { test, expect } from '@playwright/test';
import { SignatureFlowPage, AssignmentMethod } from '../Pages';
import { mockAssinafyApi, MOCK_SIGNATURE_PATH } from '../Helpers';

/**
 * E2E Tests: Signature Flow (Signer Perspective)
 *
 * Test suite covering the complete signature workflow:
 * - Accessing signature link from email
 * - Authentication/verification process
 * - Virtual signature (freehand drawing)
 * - Collect signature (positioned fields)
 * - Document decline flow
 * - Completion confirmation
 */
test.describe('Signature Flow', () => {
    let signatureFlowPage: SignatureFlowPage;

    test.beforeEach(async ({ page }) => {
        signatureFlowPage = new SignatureFlowPage(page);
        await mockAssinafyApi(page);
    });

    /**
     * =========================================================================
     * HAPPY PATHS - VIRTUAL SIGNATURE
     * =========================================================================
     */
    test.describe('Virtual Signature Flow', () => {
        test('should complete full virtual signature flow', async ({ page }) => {
            const signatureToken = 'virtual_token_' + Math.random().toString(36).substr(2, 9);

            await test.step('Access signature link', async () => {
                await signatureFlowPage.goto(signatureToken);
                await signatureFlowPage.assertIsLoaded();
            });

            await test.step('View document information', async () => {
                const docInfo = await signatureFlowPage.getDocumentInfo();
                expect(docInfo.title).toBeTruthy();
                expect(docInfo.method).toContain('virtual');
            });

            await test.step('Start signature process', async () => {
                await signatureFlowPage.startSignature();
                // May need authentication
            });

            await test.step('Authenticate if required', async ({ page }) => {
                if (await signatureFlowPage.authModal.isVisible()) {
                    await signatureFlowPage.authenticate(
                        'signer@example.com',
                        '123456'
                    );
                }
            });

            await test.step('Draw signature on canvas', async () => {
                await signatureFlowPage.assertSignatureCanvasVisible();
                await signatureFlowPage.drawSignature(MOCK_SIGNATURE_PATH);
            });

            await test.step('Accept terms and confirm', async () => {
                await signatureFlowPage.acceptTerms();
                await signatureFlowPage.assertTermsAccepted();
                await signatureFlowPage.confirmSignature();
            });

            await test.step('Verify completion', async () => {
                await signatureFlowPage.assertSignatureCompleted();
            });
        });

        test('should allow clearing and redrawing signature', async ({ page }) => {
            await signatureFlowPage.goto('virtual_test_token');

            // Navigate to signature canvas
            await signatureFlowPage.startSignature();
            await signatureFlowPage.assertSignatureCanvasVisible();

            // Draw initial signature
            await signatureFlowPage.drawSignature();

            // Clear it
            await signatureFlowPage.clearSignature();

            // Draw again
            await signatureFlowPage.drawSignature();

            // Confirm
            await signatureFlowPage.acceptTerms();
            await signatureFlowPage.confirmSignature();

            await signatureFlowPage.assertSignatureCompleted();
        });

        test('should show signer info on landing page', async ({ page }) => {
            await signatureFlowPage.goto('virtual_test_token');

            const signerInfo = await signatureFlowPage.getSignerInfo();

            expect(signerInfo.name).toBeTruthy();
            expect(signerInfo.email).toBeTruthy();
        });

        test('should allow downloading signed document', async ({ page }) => {
            await signatureFlowPage.goto('virtual_test_token');

            // Complete signature
            await signatureFlowPage.startSignature();
            await signatureFlowPage.drawSignature();
            await signatureFlowPage.acceptTerms();
            await signatureFlowPage.confirmSignature();

            // Download document
            await signatureFlowPage.downloadDocument();
        });
    });

    /**
     * =========================================================================
     * COLLECT SIGNATURE FLOW
     * =========================================================================
     */
    test.describe('Collect Signature Flow (Positioned Fields)', () => {
        test('should complete collect signature with text fields', async ({ page }) => {
            const signatureToken = 'collect_token_' + Math.random().toString(36).substr(2, 9);

            await test.step('Access signature link', async () => {
                await signatureFlowPage.goto(signatureToken);
                await signatureFlowPage.assertIsLoaded();
                await signatureFlowPage.assertAssignmentMethod(AssignmentMethod.COLLECT);
            });

            await test.step('Start signature process', async () => {
                await signatureFlowPage.startSignature();
            });

            await test.step('Fill text field', async () => {
                await signatureFlowPage.fillTextField('Texto de exemplo');
            });

            await test.step('Fill date field', async () => {
                await signatureFlowPage.fillDateField(new Date());
            });

            await test.step('Sign at field position', async () => {
                await signatureFlowPage.signAtCurrentField();
            });

            await test.step('Confirm and complete', async () => {
                await signatureFlowPage.acceptTerms();
                await signatureFlowPage.confirmSignatureButton.click();
                await signatureFlowPage.assertSignatureCompleted();
            });
        });

        test('should highlight current field to sign', async ({ page }) => {
            await signatureFlowPage.goto('collect_test_token');

            await signatureFlowPage.startSignature();

            // First field should be highlighted
            await signatureFlowPage.assertFieldHighlighted(0);

            // After filling, next field highlighted
            await signatureFlowPage.fillTextField('Test');
            await signatureFlowPage.assertFieldHighlighted(1);
        });

        test('should validate required fields before proceeding', async ({ page }) => {
            await signatureFlowPage.goto('collect_test_token');

            await signatureFlowPage.startSignature();

            // Try to skip text field
            await signatureFlowPage.nextFieldButton.click();

            // Should show validation error
            await expect(
                page.getByText(/campo obrigatório|required field/i)
            ).toBeVisible();
        });

        test('should show field count and progress', async ({ page }) => {
            await signatureFlowPage.goto('collect_test_token');

            await signatureFlowPage.startSignature();

            const fieldCount = await signatureFlowPage.getFieldCount();
            expect(fieldCount).toBeGreaterThan(0);

            // Verify progress indicator
            await expect(
                page.getByText(/campo \d+ de \d+|field \d+ of \d+/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * AUTHENTICATION
     * =========================================================================
     */
    test.describe('Authentication', () => {
        test('should send verification code to email', async ({ page }) => {
            await signatureFlowPage.goto('auth_test_token');
            await signatureFlowPage.startSignature();

            await signatureFlowPage.assertAuthRequired();

            // Request code
            await signatureFlowPage.submitEmailForCode('signer@example.com');

            // Verify confirmation
            await expect(
                page.getByText(/código enviado|code sent/i)
            ).toBeVisible();
        });

        test('should verify code and proceed', async ({ page }) => {
            await signatureFlowPage.goto('auth_test_token');
            await signatureFlowPage.startSignature();

            await signatureFlowPage.authenticate('signer@example.com', '123456');

            // Should proceed to signature
            await signatureFlowPage.assertSignatureCanvasVisible();
        });

        test('should show error for invalid code', async ({ page }) => {
            await signatureFlowPage.goto('auth_test_token');
            await signatureFlowPage.startSignature();

            await signatureFlowPage.submitEmailForCode('signer@example.com');
            await signatureFlowPage.enterVerificationCode('000000');

            // Verify error
            await expect(
                page.getByText(/código inválido|invalid code/i)
            ).toBeVisible();
        });

        test('should allow resending code', async ({ page }) => {
            await signatureFlowPage.goto('auth_test_token');
            await signatureFlowPage.startSignature();

            await signatureFlowPage.submitEmailForCode('signer@example.com');

            // Click resend
            await signatureFlowPage.resendCode();

            // Verify new code sent
            await expect(
                page.getByText(/novo código enviado|new code sent/i)
            ).toBeVisible();
        });

        test('should limit resend attempts', async ({ page }) => {
            await signatureFlowPage.goto('auth_test_token');
            await signatureFlowPage.startSignature();

            await signatureFlowPage.submitEmailForCode('signer@example.com');

            // Try resending multiple times
            for (let i = 0; i < 5; i++) {
                await signatureFlowPage.resendCode();
            }

            // Should show rate limit
            await expect(
                page.getByText(/muitas tentativas|too many attempts|aguarde/i)
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * DECLINE FLOW
     * =========================================================================
     */
    test.describe('Document Decline', () => {
        test('should decline document with reason', async ({ page }) => {
            await signatureFlowPage.goto('decline_test_token');

            await test.step('Click decline button', async () => {
                await signatureFlowPage.clickDecline();
            });

            await test.step('Select decline reason', async () => {
                await signatureFlowPage.declineReasonSelect.selectOption('Documento não reconhecido');
            });

            await test.step('Add details', async () => {
                await signatureFlowPage.declineReasonText.fill(
                    'O documento apresentado não corresponde ao que eu esperava assinar.'
                );
            });

            await test.step('Confirm decline', async () => {
                await signatureFlowPage.confirmDeclineButton.click();
            });

            await test.step('Verify decline recorded', async () => {
                await signatureFlowPage.assertSignatureDeclined();
            });
        });

        test('should require reason for declining', async ({ page }) => {
            await signatureFlowPage.goto('decline_test_token');

            await signatureFlowPage.clickDecline();

            // Try to decline without reason
            await signatureFlowPage.confirmDeclineButton.click();

            // Should show validation
            await expect(
                page.getByText(/selecione um motivo|select a reason/i)
            ).toBeVisible();
        });

        test('should provide standard decline reasons', async ({ page }) => {
            await signatureFlowPage.goto('decline_test_token');

            await signatureFlowPage.clickDecline();

            // Check available options
            const options = await signatureFlowPage.declineReasonSelect.allTextContents();

            expect(options).toContain('Documento não reconhecido');
            expect(options).toContain('Não sou o signatário');
            expect(options).toContain('Problema técnico');
            expect(options).toContain('Outro motivo');
        });
    });

    /**
     * =========================================================================
     * MOBILE RESPONSIVENESS
     * =========================================================================
     */
    test.describe('Mobile Experience', () => {
        test.use({ viewport: { width: 390, height: 844 } }); // iPhone 13

        test('should work on mobile device', async ({ page }) => {
            await signatureFlowPage.goto('mobile_test_token');

            // Verify mobile layout
            await signatureFlowPage.assertIsLoaded();

            // Verify signature canvas is touch-friendly
            await signatureFlowPage.startSignature();
            await signatureFlowPage.assertSignatureCanvasVisible();

            // Simulate touch signature
            const canvas = await signatureFlowPage.signatureCanvas.boundingBox();
            if (canvas) {
                await page.touchpoint(canvas.x + 100, canvas.y + 100);
                await page.touchpoint(canvas.x + 150, canvas.y + 100);
            }

            await signatureFlowPage.acceptTerms();
            await signatureFlowPage.confirmSignature();

            await signatureFlowPage.assertSignatureCompleted();
        });

        test('should allow zooming document on mobile', async ({ page }) => {
            await signatureFlowPage.goto('mobile_test_token');

            // Verify zoom controls on mobile
            await expect(
                page.getByRole('button', { name: /zoom|\+/i })
            ).toBeVisible();

            await expect(
                page.getByRole('button', { name: /zoom out|-/i })
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ERROR HANDLING
     * =========================================================================
     */
    test.describe('Error Handling', () => {
        test('should handle expired signature link', async ({ page }) => {
            await signatureFlowPage.goto('expired_token');

            // Should show expired message
            await expect(
                page.getByText(/link expirado|link expired|sessão expirada/i)
            ).toBeVisible();

            // Should offer option to request new link
            await expect(
                page.getByRole('button', { name: /solicitar novo|request new/i })
            ).toBeVisible();
        });

        test('should handle already signed document', async ({ page }) => {
            await signatureFlowPage.goto('already_signed_token');

            // Should show already signed message
            await expect(
                page.getByText(/já assinado|already signed|í assinado anteriormente/i)
            ).toBeVisible();
        });

        test('should handle cancelled document', async ({ page }) => {
            await signatureFlowPage.goto('cancelled_token');

            // Should show cancelled message
            await expect(
                page.getByText(/documento cancelado|document cancelled/i)
            ).toBeVisible();
        });

        test('should handle network error during signature', async ({ page }) => {
            await signatureFlowPage.goto('network_error_token');

            // Mock network failure
            await page.route('**/api/signatures/**', (route) => {
                route.abort('failed');
            });

            await signatureFlowPage.startSignature();
            await signatureFlowPage.drawSignature();
            await signatureFlowPage.acceptTerms();
            await signatureFlowPage.confirmSignature();

            // Should show error
            await expect(
                page.getByText(/erro de conexão|connection error|falha ao enviar/i)
            ).toBeVisible();

            // Should allow retry
            await expect(
                page.getByRole('button', { name: /tentar novamente|retry/i })
            ).toBeVisible();
        });
    });

    /**
     * =========================================================================
     * ACCESSIBILITY
     * =========================================================================
     */
    test.describe('Accessibility', () => {
        test('should be keyboard accessible', async ({ page }) => {
            await signatureFlowPage.goto('a11y_test_token');

            // Navigate through form
            await page.keyboard.press('Tab');
            // Should focus on start button or first interactive element

            await page.keyboard.press('Enter');

            // Continue through flow with keyboard
            await page.keyboard.press('Tab');
            await page.keyboard.press('Tab');

            // Terms checkbox should be focusable
            await signatureFlowPage.acceptTerms();
        });

        test('should have proper ARIA labels', async ({ page }) => {
            await signatureFlowPage.goto('a11y_test_token');

            // Check heading
            await expect(
                page.getByRole('heading', { level: 1 })
            ).toBeVisible();

            // Check canvas has aria-label
            const canvas = signatureFlowPage.signatureCanvas;
            await expect(canvas).toHaveAttribute('aria-label', /área de assinatura|signature area/i);
        });
    });
});
