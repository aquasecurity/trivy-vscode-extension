import * as vscode from 'vscode';

import { showInformationMessage } from '../notification/notifications';

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
    toolkitSrc,
    codiconsSrc
  );

  const config = vscode.workspace.getConfiguration('trivy');

  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.command) {
        case 'storeSecrets':
          config.update('aquaApiUrl', message.apiUrl);
          config.update('aquaAuthenticationUrl', message.authUrl);
          config.update('useAquaPlatform', message.enableAquaPlatform);
          vscode.commands.executeCommand(
            'setContext',
            'trivy.useAquaPlatform',
            message.enableAquaPlatform
          );
          config.update('uploadResults', message.uploadResults);
          await context.secrets.store('apiKey', message.apiKey);
          await context.secrets.store('apiSecret', message.apiSecret);
          showInformationMessage(
            'Aqua Platform configuration saved successfully'
          );
          panel.dispose();
          return;
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
  toolkitSrc: vscode.Uri,
  codiconsSrc: vscode.Uri
) {
  const config = vscode.workspace.getConfiguration('trivy');
  const useAquaPlatform = config.get<boolean>('useAquaPlatform');
  const aquaApiUrl = config.get('aquaApiUrl');
  const aquaAuthenticationUrl = config.get('aquaAuthenticationUrl');
  const uploadResults = config.get<boolean>('uploadResults');

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
              <vscode-checkbox id="uploadResults" name="uploadResults" ${uploadResults ? 'checked' : ''}>Upload Results</vscode-checkbox> <br>
              <br />
              <details>
                 <summary>Advanced setup <i>(should really be left alone)</i></summary>
                 <p>Only change these if you know what you are doing, otherwise leave them blank.</p>
                 <vscode-text-field size="64" id="apiUrl" name="apiUrl" value="${aquaApiUrl}">
                 Aqua API URL
                 <span slot="start" class="codicon codicon-globe"></span>
                 </vscode-text-field><br />
                 <vscode-text-field size="64" id="authUrl" name="authUrl" value="${aquaAuthenticationUrl}">
                 Authentication Endpoint
                 <span slot="start" class="codicon codicon-globe"></span>
                 </vscode-text-field><br />
              </details>
              <br>
              <vscode-button id="save-button" appearance="primary" type="submit" >Save</vscode-button>
              <!-- <button type="submit">Save</button> -->
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
           });
           
           document.getElementById('save-button').addEventListener('click', event => {
               event.preventDefault();
               const apiKey = document.getElementById('apiKey').value;
               const apiSecret = document.getElementById('apiSecret').value;
               const apiUrl = document.getElementById('apiUrl').value;
               const authUrl = document.getElementById('authUrl').value;
               const enableAquaPlatform = document.getElementById('enableAquaPlatform').checked;
               const uploadResults = document.getElementById('uploadResults').checked;
               vscode.postMessage({ command: 'storeSecrets', apiKey, apiSecret, apiUrl, authUrl, enableAquaPlatform, uploadResults });
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
