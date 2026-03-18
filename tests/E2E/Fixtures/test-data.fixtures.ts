import { test as base } from '@playwright/test';
import { SignerFormData, DocumentFormData, AssignmentData, AssignmentMethod } from '../Pages';
import { generateTestEmail, generateTestTitle, VALID_CPFS } from '../Helpers/pdf-helpers';

/**
 * Test data fixtures
 */
export interface TestDataFixtures {
    testSigner: SignerFormData;
    testDocument: DocumentFormData;
    testVirtualAssignment: AssignmentData;
    testCollectAssignment: AssignmentData;
    multipleSigners: SignerFormData[];
}

/**
 * Extended test with test data fixtures
 */
export const test = base.extend<TestDataFixtures>({
    testSigner: async ({}, use) => {
        const signer: SignerFormData = {
            fullName: 'João Silva',
            email: generateTestEmail('joao'),
            phone: '+5511999999999',
            documentType: 'cpf',
            documentNumber: VALID_CPFS[0],
        };

        await use(signer);
    },

    testDocument: async ({}, use) => {
        const document: DocumentFormData = {
            title: generateTestTitle('Contrato'),
            description: 'Documento para teste E2E',
            processoId: 'PROC-' + Date.now(),
            oficioId: 'OF-' + Math.floor(Math.random() * 10000),
        };

        await use(document);
    },

    testVirtualAssignment: async ({}, use) => {
        const assignment: AssignmentData = {
            method: AssignmentMethod.VIRTUAL,
            signerEmails: [
                generateTestEmail('signer1'),
                generateTestEmail('signer2'),
            ],
            message: 'Por favor, assine este documento.',
            deadlineDays: 7,
            signInOrder: true,
        };

        await use(assignment);
    },

    testCollectAssignment: async ({}, use) => {
        const assignment: AssignmentData = {
            method: AssignmentMethod.COLLECT,
            signerEmails: [generateTestEmail('signer1')],
            message: 'Assinatura com campos posicionados',
            deadlineDays: 14,
            fields: [
                {
                    type: 'signature',
                    page: 1,
                    x: 100,
                    y: 700,
                    width: 200,
                    height: 50,
                },
                {
                    type: 'initials',
                    page: 1,
                    x: 100,
                    y: 650,
                    width: 80,
                    height: 40,
                },
            ],
        };

        await use(assignment);
    },

    multipleSigners: async ({}, use) => {
        const signers: SignerFormData[] = [
            {
                fullName: 'Ana Souza',
                email: generateTestEmail('ana'),
                phone: '+5511888888888',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[1],
            },
            {
                fullName: 'Carlos Oliveira',
                email: generateTestEmail('carlos'),
                phone: '+5511777777777',
                documentType: 'cpf',
                documentNumber: VALID_CPFS[2],
            },
            {
                fullName: 'Distribuidora LTDA',
                email: generateTestEmail('empresa'),
                phone: '+5511666666666',
                documentType: 'cnpj',
                documentNumber: '12.345.678/0001-95',
            },
        ];

        await use(signers);
    },
});

export { expect } from '@playwright/test';
