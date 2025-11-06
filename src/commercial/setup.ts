import * as vscode from 'vscode';

import { Output } from '../command/output';
import { showInformationMessage } from '../ui/notification/notifications';
import { showErrorMessage, showWarningWithLink } from '../utils';

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

  const config = vscode.workspace.getConfiguration('trivy');
  const customApiUrl = config.get<string>('aquaApiUrl') || '';
  const customAuthUrl = config.get<string>('aquaAuthenticationUrl') || '';

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
    customApiUrl,
    customAuthUrl,
    toolkitSrc,
    codiconsSrc
  );

  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'storeSecrets': {
          let validCreds = true;
          let aquaUrl = message.customApiUrl || '';
          let cspmUrl = message.customAuthUrl || '';
          if (message.aquaRegionValue !== 'custom') {
            const regionalUrls =
              regionMap[message.aquaRegionValue as keyof typeof regionMap];
            if (message.enableAquaPlatform) {
              if (message.apiKey === '' || message.apiSecret === '') {
                showInformationMessage(
                  'Please fill in all the required fields'
                );
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
              aquaUrl = regionalUrls.apiUrl;
              cspmUrl = regionalUrls.authUrl;
            }
          } else {
            if (aquaUrl === '' || cspmUrl === '') {
              showErrorMessage(
                `Custom region selected but API Url or Authentication Url is empty`
              );
              return;
            }
          }

          await checkCredentialConnection({
            apiKey: message.apiKey,
            apiSecret: message.apiSecret,
            aquaUrl: aquaUrl,
            cspmUrl: cspmUrl,
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

          if (validCreds) {
            if (message.enableAquaPlatform) {
              vscode.window.showInformationMessage(
                'Aqua Platform credentials validated successfully'
              );
            }
            config.update('aquaApiUrl', aquaUrl);
            config.update('aquaAuthenticationUrl', cspmUrl);
            if (message.proxyServer && message.prxoyServer.startsWith('http')) {
              config.update('proxyServer', message.proxyServer);
            } else if (message.proxyServer === '') {
              config.update('proxyServer', undefined);
            }
            config.update('caCertPath', message.caCertPath);
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
        case 'browseCaCert': {
          const options: vscode.OpenDialogOptions = {
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select CA Certificate',
            filters: {
              'Certificate Files': ['pem', 'crt', 'cer', 'der'],
              'All Files': ['*'],
            },
            title: 'Select CA Certificate',
          };

          vscode.window.showOpenDialog(options).then((fileUri) => {
            if (fileUri && fileUri[0]) {
              panel.webview.postMessage({
                command: 'updateCaCertPath',
                path: fileUri[0].fsPath,
              });
            }
          });
          return;
        }
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
  customApiUrl: string,
  customAuthUrl: string,
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
              <label for="aqua-platform-region" id="region-label">Region</label>
              <vscode-dropdown id="aqua-platform-region" name="aqua-platform-region" value="${aquaRegion}" ${!useAquaPlatform ? 'disabled' : ''}>
              <vscode-option value="default">US (Default)</vscode-option>
              <vscode-option value="eu">EU</vscode-option>
              <vscode-option value="ap-1">Singapore</vscode-option>
              <vscode-option value="ap-2">Sydney</vscode-option>
              <vscode-option value="custom">Custom</vscode-option>
              </vscode-dropdown>
              <vscode-text-field size="48" id="customApiUrl" name="customApiUrl" style="display: ${aquaRegion === 'custom' ? 'inline-block' : 'none'}" value="${customApiUrl}" ${!useAquaPlatform ? 'disabled' : ''}>
              API Url
              <span slot="start" class="codicon codicon-globe"></span>
              </vscode-text-field>
              <vscode-text-field size="48" id="custonAuthUrl" name="custonAuthUrl" style="display: ${aquaRegion === 'custom' ? 'inline-block' : 'none'}" value="${customAuthUrl}" ${!useAquaPlatform ? 'disabled' : ''}>
              API Authentication Url
              <span slot="start" class="codicon codicon-globe"></span>
              </vscode-text-field>
              <vscode-text-field size="48" id="proxyServer" name="proxyServer" value="${config.get<string>('proxyServer') || ''}" ${!useAquaPlatform ? 'disabled' : ''}>
              HTTP Proxy Server
              <span slot="start" class="codicon codicon-globe"></span>
              </vscode-text-field>
              <div style="display: flex; align-items: center; gap: 8px;">
                <vscode-text-field size="48" id="caCertPath" name="caCertPath" value="${config.get<string>('caCertPath') || ''}" ${!useAquaPlatform ? 'disabled' : ''}>
                  CA Certificate Path
                  
                  <span slot="end" class="codicon codicon-folder-opened" style="cursor: pointer; opacity: ${!useAquaPlatform ? '0.4' : '1'};" id="browse-cert-icon"></span>
                </vscode-text-field>
              </div>
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

           window.addEventListener('message', event => {
                const message = event.data;
                if (message && message.command) {
                    switch (message.command) {
                        case 'updateCaCertPath':
                            const caCertPathElem = document.getElementById('caCertPath');
                            if (caCertPathElem) {
                                caCertPathElem.value = message.path;
                            }
                            break;
                    }
                }
           });

           document.getElementById('enableAquaPlatform').addEventListener('change', event => {
                const checked = event.target.checked;
                document.getElementById('apiKey').disabled = !checked;
                document.getElementById('apiSecret').disabled = !checked;
                document.getElementById('aqua-platform-region').disabled = !checked;
                document.getElementById('customApiUrl').disabled = !checked;
                document.getElementById('custonAuthUrl').disabled = !checked;
                document.getElementById('proxyServer').disabled = !checked;
                document.getElementById('caCertPath').disabled = !checked;
                document.getElementById('browse-cert-icon').style.opacity = checked ? '1' : '0.4';
                const regionLabel = document.getElementById('region-label');
                if (!checked) {
                    regionLabel.classList.add('disabled');
                } else {
                    regionLabel.classList.remove('disabled');
                }
           });

           document.getElementById('browse-cert-icon').addEventListener('click', (event) => {
                if (!document.getElementById('enableAquaPlatform').checked) {
                    return;
                }
                vscode.postMessage({ 
                    command: 'browseCaCert'
                });
           });

           document.getElementById('aqua-platform-region').addEventListener('change', event => {
                const selectedValue = event.target.value;
                const customApiUrl = document.getElementById('customApiUrl');
                const customAuthUrl = document.getElementById('custonAuthUrl');

                if (selectedValue === 'custom') {
                  customApiUrl.style.display = 'inline-block';
                  customAuthUrl.style.display = 'inline-block';
                } else {
                  customApiUrl.style.display = 'none';
                  customAuthUrl.style.display = 'none';
                }
           });
           
           document.getElementById('save-button').addEventListener('click', event => {
               event.preventDefault();
               const apiKey = document.getElementById('apiKey').value;
               const apiSecret = document.getElementById('apiSecret').value;

               const aquaRegion = document.getElementById('aqua-platform-region');
               const aquaRegionValue = aquaRegion.options[aquaRegion.selectedIndex].value;
               let customApiUrl = '';
                let customAuthUrl = '';

               if (aquaRegionValue === 'custom') {
                   customApiUrl = document.getElementById('customApiUrl').value;
                   customAuthUrl = document.getElementById('custonAuthUrl').value;
               } 

               const proxyServer = document.getElementById('proxyServer').value;
               const caCertPath = document.getElementById('caCertPath').value;
               const enableAquaPlatform = document.getElementById('enableAquaPlatform').checked;
               vscode.postMessage({ command: 'storeSecrets', apiKey, apiSecret, aquaRegionValue, enableAquaPlatform, customApiUrl, customAuthUrl, proxyServer, caCertPath });
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
