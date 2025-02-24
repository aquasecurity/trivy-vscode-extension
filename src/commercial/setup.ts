import * as vscode from 'vscode';
import { showInformationMessage } from '../notification/notifications';

export async function setupCommercial(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'trivyCommercialSetup',
    'Configure Aqua Platform',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
    }
  );

  const imagePath = vscode.Uri.file(
    vscode.Uri.joinPath(context.extensionUri, 'resources', 'trivy.svg').fsPath
  );

  const imageSrc = panel.webview.asWebviewUri(imagePath);

  const apiKey = (await context.secrets.get('apiKey')) || '';
  const apiSecret = (await context.secrets.get('apiSecret')) || '';

  panel.webview.html = getWebviewContent(imageSrc, apiKey, apiSecret);

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

function getWebviewContent(
  trivyLogo: vscode.Uri,
  apiKey: string,
  apiSecret: string
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
        <style>
           body {
           color: var(--vscode-editor-foreground);
           background-color: var(--vscode-editor-background);
           font-family: var(--vscode-font-family);
           padding: 20px;
           }
           h2 {
           color: var(--vscode-editor-foreground);
           }
           label {
           display: block;
           margin: 10px 0 5px;
           }
           input:not([type='checkbox']) {
           width: 100%;
           padding: 8px;
           margin-bottom: 20px;
           background-color: var(--vscode-input-background);
           color: var(--vscode-input-foreground);
           border: 1px solid var(--vscode-input-foreground);
           border-radius: 4px;
           }
           input[disabled]:not([type='checkbox']) {
           width: 100%;
           padding: 8px;
           margin-bottom: 20px;
           background-color: var(--vscode-input-background);
           color: var(--vscode-disabledForeground);
           border: 1px solid var(--vscode-input-foreground);
           border-radius: 4px;
           }


           button {
           background-color: var(--vscode-button-background);
           color: var(--vscode-button-foreground);
           padding: 10px 20px;
           border: 1px solid var(--vscode-input-foreground);;
           border-radius: 4px;
           cursor: pointer;
           display: block;

           }
           button:hover {
           background-color: var(--vscode-button-hoverBackground);
           }
           input[type="checkbox"] {
           -webkit-appearance: none;
           width: 30px;
           height: 15px;
           border: 2px solid grey;
           position: relative;
           border-radius: 50px;
           box-sizing: content-box;
           cursor: pointer;
           transition: background 150ms ease-in-out;
           background: white;
           }
           input[type="checkbox"]::after {
           top: 0;
           left: 0;
           transition: left 150ms ease-in-out;
           content: ' ';
           width: 15px;
           height: 15px;
           background: lightgrey;
           box-shadow: inset 0 0 0px 1px black;
           position: absolute;
           border-radius: 50px;
           }
           input[type="checkbox"]:checked {
           background: var(--vscode-button-background);
           }
           input[type="checkbox"]:checked::after {
           left: calc(100% - 15px);
           }
           .container {
           width: 60%;
           }
           .logo {
           float: right;
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
           <p>You will need to <a href="https://cloud-dev.aquasec.com/ah/#/cspm/apikeys">generate API Key and Secret from the Aqua Platform</a> </p>
           <br />
           <br />
           
           <h2>Configure Aqua Plugin</h2>
              <label for="enableAquaPlatform">Enabled</label>
              <input type="checkbox" id="enableAquaPlatform" name="enableAquaPlatform" ${useAquaPlatform ? 'checked' : ''}>
              <label for="apiKey">API Key</label>
              <input type="password" id="apiKey" name="apiKey" required value="${apiKey}">
              <label for="apiSecret">API Secret</label>
              <input type="password" id="apiSecret" name="apiSecret" required value="${apiSecret}">
              <label for="uploadResults">Upload results</label>
              <input type="checkbox" id="uploadResults" name="uploadResults" ${uploadResults ? 'checked' : ''}>
              <details>
                 <summary>Advanced setup <i>(should really be left alone)</i></summary>
                 <br>
                 <p>Only change these if you know what you are doing, otherwise leave them blank.</p>
                 <label for="apiUrl">Aqua API URL</label>
                 <input type="input" id="apiUrl" name="apiUrl" value="${aquaApiUrl}">
                 <label for="authUrl">Authentication Endpoint</label>
                 <input type="input" id="authUrl" name="authUrl" value="${aquaAuthenticationUrl}">
              </details>
              <br>
              <button type="submit">Save</button>
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
            alert(event.target.checked);
                const form = document.getElementById('secrets-form');
                const inputs = form.querySelectorAll('input');
                inputs.forEach(input => {
                  if (input.id !== 'enableAquaPlatform') {
                    input.disabled = !event.target.checked;
                  }
                });
                const uploadResults = document.getElementById('uploadResults');
                uploadResults.disabled = !event.target.checked;
           });
           
           document.getElementById('secrets-form').addEventListener('submit', event => {
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
