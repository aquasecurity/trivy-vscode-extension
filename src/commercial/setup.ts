import * as vscode from 'vscode';

import { Output } from '../command/output';
import { showInformationMessage } from '../ui/notification/notifications';
import { showWarningWithLink } from '../utils';

import checkCredentialConnection from './cred_check';

const regionMap = {
  default: {
    apiUrl: 'https://api.supply-chain.cloud.aquasec.com',
    authUrl: 'https://api.cloudsploit.com',
  },
  eu: {
    apiUrl: 'https://api.eu-1.supply-chain.cloud.aquasec.com',
    authUrl: 'https://eu-1.api.cloudsploit.com',
  },
  'ap-1': {
    apiUrl: 'https://api.ap-1.supply-chain.cloud.aquasec.com',
    authUrl: 'https://ap-1.api.cloudsploit.com',
  },
  'ap-2': {
    apiUrl: 'https://api.ap-2.supply-chain.cloud.aquasec.com',
    authUrl: 'https://ap-2.api.cloudsploit.com',
  },
  dev: {
    apiUrl: 'https://api.dev.supply-chain.cloud.aquasec.com',
    authUrl: 'https://stage.api.cloudsploit.com',
  },
};

/**
 * Setup the Aqua Platform configuration
 * @param context Extension context
 */
export async function setupCommercial(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'trivyCommercialSetup',
    'Configure Aqua Platform',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(context.extensionUri, 'resources'),
        vscode.Uri.joinPath(
          context.extensionUri,
          'node_modules',
          '@vscode',
          'webview-ui-toolkit',
          'dist'
        ),
        vscode.Uri.joinPath(
          context.extensionUri,
          'node_modules',
          '@vscode',
          'codicons',
          'dist'
        ),
      ],
    }
  );

  const imagePath = vscode.Uri.file(
    vscode.Uri.joinPath(context.extensionUri, 'resources', 'trivy.svg').fsPath
  );

  const imageSrc = panel.webview.asWebviewUri(imagePath);

  const apiKey = (await context.secrets.get('apiKey')) || '';
  const apiSecret = (await context.secrets.get('apiSecret')) || '';
  const aquaRegion = (await context.secrets.get('aquaRegion')) || 'default';

  const codiconsSrc = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'node_modules',
      '@vscode',
      'codicons',
      'dist',
      'codicon.css'
    )
  );
  const toolkitSrc = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(
      context.extensionUri,
      'node_modules',
      '@vscode',
      'webview-ui-toolkit',
      'dist',
      'toolkit.js'
    )
  );

  panel.webview.html = getWebviewContent(
    imageSrc,
    apiKey,
    apiSecret,
    aquaRegion,
    toolkitSrc,
    codiconsSrc
  );

  const config = vscode.workspace.getConfiguration('trivy');
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'storeSecrets': {
          let validCreds = true;
          const regionalUrls =
            regionMap[message.aquaRegionValue as keyof typeof regionMap];
          if (message.enableAquaPlatform) {
            if (message.apiKey === '' || message.apiSecret === '') {
              showInformationMessage('Please fill in all the required fields');
              return;
            }

            if (!regionalUrls) {
              showWarningWithLink(
                `Invalid region selected`,
                'Learn more',
                'https://docs.aquasec.com/saas/getting-started/welcome/saas-regions/'
              );
              return;
            }

            await checkCredentialConnection({
              apiKey: message.apiKey,
              apiSecret: message.apiSecret,
              aquaUrl: regionalUrls.apiUrl,
              cspmUrl: regionalUrls.authUrl,
            })
              .then(async (result: boolean) => {
                if (!result) {
                  throw new Error('Failed to validate credentials');
                }
              })
              .catch((error) => {
                Output.getInstance().appendLine(error.message);
                validCreds = false;
                showWarningWithLink(
                  `Failed to validate credentials`,
                  'Learn more',
                  'https://docs.aquasec.com/saas/getting-started/welcome/saas-regions/'
                );
              });
          }

          if (validCreds) {
            if (message.enableAquaPlatform) {
              vscode.window.showInformationMessage(
                'Aqua Platform credentials validated successfully'
              );
            }
            config.update('aquaApiUrl', regionalUrls.apiUrl);
            config.update('aquaAuthenticationUrl', regionalUrls.authUrl);
            config.update('useAquaPlatform', message.enableAquaPlatform);
            vscode.commands.executeCommand(
              'setContext',
              'trivy.useAquaPlatform',
              message.enableAquaPlatform
            );

            await context.secrets.store('apiKey', message.apiKey);
            await context.secrets.store('apiSecret', message.apiSecret);
            await context.secrets.store('aquaRegion', message.aquaRegionValue);
            showInformationMessage(
              'Aqua Platform configuration saved successfully'
            );
            panel.dispose();
            return;
          }

          break;
        }
        case 'openExtenalLink':
          vscode.env.openExternal(vscode.Uri.parse(message.url));
          return;
      }
    },
    undefined,
    context.subscriptions
  );
}

/**
 * Get the webview content
 * @param trivyLogo The Trivy logo URI
 * @param apiKey The API key
 * @param apiSecret The API secret
 * @param toolkitSrc The toolkit script URI
 * @param codiconsSrc The codicons CSS URI
 */
function getWebviewContent(
  trivyLogo: vscode.Uri,
  apiKey: string,
  apiSecret: string,
  aquaRegion: string,
  toolkitSrc: vscode.Uri,
  codiconsSrc: vscode.Uri
) {
  const config = vscode.workspace.getConfiguration('trivy');
  const useAquaPlatform = config.get<boolean>('useAquaPlatform');

  return /* html */ `
  <!DOCTYPE html>
  <html lang="en">
     <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <title>API Key and Secret</title>
        <script type="module" nonce="${getNonce()}" src="${toolkitSrc}"></script>
        <link href="${codiconsSrc}" nonce=${getNonce()} rel="stylesheet" />
   <style nonce="${getNonce()}">

           body {
           color: var(--vscode-editor-foreground);
           background-color: var(--vscode-editor-background);
           font-family: var(--vscode-font-family);
           padding: 20px;
           }
           h2 {
           color: var(--vscode-editor-foreground);
           }
           <span slot="start" class="codicon codicon-key"></span>
           .container {
           width: 60%;
           }
           .logo {
           float: right;
           }
           
           vscode-text-field, vscode-checkbox, vscode-button {
            margin: 10px 0;
           }
           
           #secrets-form {

            width: 60%;
           }

           .dropdown-container {
            box-sizing: border-box;
            display: flex;
            flex-flow: column nowrap;
            align-items: flex-start;
            justify-content: flex-start;
          }

          .dropdown-container label {
            display: block;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: var(--vscode-font-size);
            line-height: normal;
            margin-bottom: 2px;
          }

          .dropdown-container label.disabled {
            opacity: 0.4;
            cursor: default;
          }
        </style>


     </head>
     <body>
        <div class="container">
        <form id="secrets-form">
           <img class="logo" src="${trivyLogo}" alt="Trivy logo" width="150" height="150">
           <h1>Configure Trivy for Aqua Platform</h1>
           <p>Use this screen to configure the credentials and configuration for the Aqua Platform.</p>
           <p>You will need to <a href="https://cloud.aquasec.com/ah/#/cspm/apikeys">generate API Key and Secret from the Aqua Platform</a> </p>
           <br />
           <br />
           
           <h2>Configure Aqua Plugin</h2>
              <vscode-checkbox id="enableAquaPlatform" name="enableAquaPlatform" ${useAquaPlatform ? 'checked' : ''}>Enabled</vscode-checkbox><br />
              <vscode-text-field size="32" type="password" id="apiKey" name="apiKey" value="${apiKey}" ${!useAquaPlatform ? 'disabled' : ''}>
              API Key
              <span slot="start" class="codicon codicon-key"></span>
              </vscode-text-field><br />
              <vscode-text-field size="32" type="password" id="apiSecret" name="apiKey" value="${apiSecret}" ${!useAquaPlatform ? 'disabled' : ''}>
              API Secret
              <span slot="start" class="codicon codicon-key"></span>
              </vscode-text-field><br>
              <div class="dropdown-container">
              <label for="aqua-platform-region" id="region-label">Region:</label>
              <vscode-dropdown id="aqua-platform-region" name="aqua-platform-region" value="${aquaRegion}" ${!useAquaPlatform ? 'disabled' : ''}>
              <vscode-option value="default">US (Default)</vscode-option>
              <vscode-option value="eu">EU</vscode-option>
              <vscode-option value="ap-1">Singapore</vscode-option>
              <vscode-option value="ap-2">Sydney</vscode-option>
              <!-- TODO: remove dev region -->
              <vscode-option value="dev">Dev</vscode-option>  
              </vscode-dropdown>
            </div>
              <vscode-button id="save-button" appearance="primary" type="submit" >Save</vscode-button>
           </form>
        </div>
        <script>
           const vscode = acquireVsCodeApi();

           document.addEventListener('click', (event) => {
        const target = event.target.closest('a');
        if (target && target.href.startsWith('http')) {
            event.preventDefault();
            vscode.postMessage({ command: 'openExternalLink', url: target.href });
        }
    });



           document.getElementById('enableAquaPlatform').addEventListener('change', event => {
                const checked = event.target.checked;
                document.getElementById('apiKey').disabled = !checked;
                document.getElementById('apiSecret').disabled = !checked;
                document.getElementById('aqua-platform-region').disabled = !checked;
                const regionLabel = document.getElementById('region-label');
                if (!checked) {
                    regionLabel.classList.add('disabled');
                } else {
                    regionLabel.classList.remove('disabled');
                }
           });
           
           document.getElementById('save-button').addEventListener('click', event => {
               event.preventDefault();
               const apiKey = document.getElementById('apiKey').value;
               const apiSecret = document.getElementById('apiSecret').value;

              const aquaRegion = document.getElementById('aqua-platform-region');
                const aquaRegionValue = aquaRegion.options[aquaRegion.selectedIndex].value;
               const enableAquaPlatform = document.getElementById('enableAquaPlatform').checked;
               vscode.postMessage({ command: 'storeSecrets', apiKey, apiSecret, aquaRegionValue, enableAquaPlatform });
           });
        </script>
     </body>
  </html>
  `;
}

/**
 * Generate a nonce for Content Security Policy
 * @returns A random nonce
 */
function getNonce(): string {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
