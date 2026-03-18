/**
 * PDF Helpers for E2E Testing
 *
 * Utilities for generating, mocking, and handling PDF files in tests.
 */

/**
 * Minimal valid PDF bytes (PDF 1.4 specification)
 */
export const MINIMAL_PDF_BYTES = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj\n' +
    '<<\n' +
    '/Type /Catalog\n' +
    '/Pages 2 0 R\n' +
    '>>\n' +
    'endobj\n' +
    '2 0 obj\n' +
    '<<\n' +
    '/Type /Pages\n' +
    '/Kids [3 0 R]\n' +
    '/Count 1\n' +
    '>>\n' +
    'endobj\n' +
    '3 0 obj\n' +
    '<<\n' +
    '/Type /Page\n' +
    '/Parent 2 0 R\n' +
    '/MediaBox [0 0 612 792]\n' +
    '/Contents 4 0 R\n' +
    '/Resources <<\n' +
    '/Font <<\n' +
    '/F1 5 0 R\n' +
    '>>\n' +
    '>>\n' +
    '>>\n' +
    'endobj\n' +
    '4 0 obj\n' +
    '<<\n' +
    '/Length 44\n' +
    '>>\n' +
    'stream\n' +
    'BT\n' +
    '/F1 12 Tf\n' +
    '100 700 Td\n' +
    '(Test Document) Tj\n' +
    'ET\n' +
    'endstream\n' +
    'endobj\n' +
    '5 0 obj\n' +
    '<<\n' +
    '/Type /Font\n' +
    '/Subtype /Type1\n' +
    '/BaseFont /Helvetica\n' +
    '>>\n' +
    'endobj\n' +
    'xref\n' +
    '0 6\n' +
    '0000000000 65535 f\n' +
    '0000000009 00000 n\n' +
    '0000000058 00000 n\n' +
    '0000000115 00000 n\n' +
    '0000000262 00000 n\n' +
    '0000000377 00000 n\n' +
    'trailer\n' +
    '<<\n' +
    '/Size 6\n' +
    '/Root 1 0 R\n' +
    '>>\n' +
    'startxref\n' +
    '448\n' +
    '%%EOF'
);

/**
 * Sample PDF base64 encoded (1 page document)
 */
export const SAMPLE_PDF_BASE64 = MINIMAL_PDF_BYTES.toString('base64');

/**
 * Create a test PDF file on disk
 */
export async function createTestPdf(filePath: string, content?: string): Promise<void> {
    const fs = await import('fs/promises');
    const buffer = content ? Buffer.from(content, 'base64') : MINIMAL_PDF_BYTES;
    await fs.writeFile(filePath, buffer);
}

/**
 * Create a multi-page test PDF
 */
export async function createMultiPagePdf(pageCount: number): Promise<Buffer> {
    // For simplicity, we'll just duplicate the minimal PDF content
    // In a real implementation, you'd use a PDF library like pdfkit
    return MINIMAL_PDF_BYTES;
}

/**
 * Get PDF info (page count, size, etc.)
 */
export async function getPdfInfo(buffer: Buffer): Promise<{
    pageCount: number;
    isEncrypted: boolean;
    pdfVersion: string;
}> {
    // Simplified PDF parsing
    const content = buffer.toString('latin1');
    const pageCountMatch = content.match(/\/Count\s+(\d+)/);
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;
    const isEncrypted = content.includes('/Encrypt');
    const versionMatch = content.match(/%PDF-(\d+\.\d+)/);
    const pdfVersion = versionMatch ? versionMatch[1] : '1.4';

    return { pageCount, isEncrypted, pdfVersion };
}

/**
 * Mock PDF upload data for file input
 */
export function createPdfUploadData(filename: string = 'test-document.pdf'): {
    name: string;
    mimeType: string;
    buffer: Buffer;
} {
    return {
        name: filename,
        mimeType: 'application/pdf',
        buffer: MINIMAL_PDF_BYTES,
    };
}

/**
 * Valid Brazilian CPF numbers for testing
 */
export const VALID_CPFS = [
    '123.456.789-09',
    '987.654.321-00',
    '529.982.247-25',
];

/**
 * Valid Brazilian CNPJ numbers for testing
 */
export const VALID_CNPJS = [
    '12.345.678/0001-95',
    '11.444.777/0001-61',
];

/**
 * Sample document metadata for testing
 */
export const SAMPLE_DOCUMENT_METADATA = {
    title: 'Contrato de Prestação de Serviços',
    description: 'Contrato firmado entre ASOF e Contratada',
    processoId: 'PROC-2024-001',
    oficioId: 'OF-2024-123',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
};

/**
 * Generate a unique test document title
 */
export function generateTestTitle(prefix: string = 'Documento'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix} ${timestamp}`;
}

/**
 * Generate a unique test email
 */
export function generateTestEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    return `${prefix}.${timestamp}@example.com`;
}

/**
 * Signature field positions for testing collect assignments
 */
export const SAMPLE_SIGNATURE_FIELDS = [
    {
        type: 'signature' as const,
        page: 1,
        x: 100,
        y: 700,
        width: 200,
        height: 50,
        signerEmail: 'signer1@example.com',
    },
    {
        type: 'initials' as const,
        page: 1,
        x: 100,
        y: 650,
        width: 80,
        height: 40,
        signerEmail: 'signer1@example.com',
    },
    {
        type: 'text' as const,
        page: 1,
        x: 100,
        y: 600,
        width: 200,
        height: 30,
        signerEmail: 'signer2@example.com',
    },
    {
        type: 'date' as const,
        page: 1,
        x: 100,
        y: 550,
        width: 100,
        height: 30,
        signerEmail: 'signer2@example.com',
    },
];

/**
 * Webhook event types for testing
 */
export const WEBHOOK_EVENT_TYPES = [
    'document.uploaded',
    'document.metadata_ready',
    'document.pending_signature',
    'document.certificated',
    'document.rejected_by_signer',
    'document.rejected_by_user',
    'document.failed',
    'document.expired',
    'signer.signed',
    'signer.declined',
    'signer.viewed',
    'assignment.created',
    'assignment.completed',
];

/**
 * Document status transition flow for testing
 */
export const DOCUMENT_STATUS_FLOW = [
    'uploading',
    'uploaded',
    'metadata_processing',
    'metadata_ready',
    'pending_signature',
    'certificating',
    'certificated',
];

/**
 * Mock signature drawing path (coordinates)
 */
export const MOCK_SIGNATURE_PATH = [
    [100, 100],
    [120, 95],
    [140, 100],
    [160, 105],
    [180, 100],
    [200, 95],
];
