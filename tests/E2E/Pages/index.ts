/**
 * Page Objects - Barrel Export
 *
 * Central export point for all page objects.
 */
export { BasePage } from './BasePage';
export { DashboardPage } from './DashboardPage';
export { SignersPage } from './SignersPage';
export type { SignerFormData } from './SignersPage';
export { DocumentsPage, AssignmentMethod } from './DocumentsPage';
export type {
    DocumentStatus,
    DocumentFormData,
    DocumentFilters,
    SignatureField,
    AssignmentData,
} from './DocumentsPage';
export { SignatureFlowPage } from './SignatureFlowPage';
