export const SCAN_WITH_TRIVY = 'scan_with_trivy';
export const GET_TRIVY_VERSION = 'get_trivy_version';
export const UPDATE_TRIVY_TREEVIEW = 'update_trivy_treeview';

export const mcpTools = [
  {
    name: UPDATE_TRIVY_TREEVIEW,
    description: 'Update the Trivy tree view with the latest scan results',
    inputSchema: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          description: 'Additional context for the scan',
        },
      },
      required: [],
    },
  },
  {
    name: GET_TRIVY_VERSION,
    description:
      'Get the current version of Trivy that is installed on the system',
    inputSchema: {
      type: 'object',
      properties: {
        context: {
          type: 'object',
          description: 'Additional context for the scan',
        },
      },
      required: [],
    },
  },
  {
    name: SCAN_WITH_TRIVY,
    description:
      'Scan a project for vulnerabilities, misconfigurations, licenses, and secrets issue using Trivy',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project to scan',
        },
        scanType: {
          type: 'array',
          description: 'Type of scan to perform',
          items: {
            type: 'string',
            enum: ['vuln', 'misconfig', 'license', 'secret'],
            description: 'Type of scan to perform',
          },
        },
        severities: {
          type: 'array',
          description: 'Severities to include in the scan',
          items: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            description: 'list of severities to include in the scan results',
          },
        },
        context: {
          type: 'object',
          description: 'Additional context for the scan',
        },
      },
      required: ['projectPath', 'scanType'],
    },
  },
];
