import { Webview, WebviewView, WebviewViewProvider } from 'vscode';
import {
  Misconfiguration,
  TrivyResult,
  Vulnerability,
  Secret,
} from './trivy_result';
import { TrivyTreeItem, TrivyTreeItemType } from './trivy_treeitem';

const baseHTML = `
<style>

th {
  text-align: left;
}

ul {
  margin: 0;
  padding: 0;
  padding-left: 10px;
  margin-left: 5px;
}

</style>


`;

export class TrivyHelpProvider implements WebviewViewProvider {
  private view: Webview | undefined;

  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    this.view = webviewView.webview;
    this.update(null);
  }

  update(item: TrivyTreeItem | null) {
    if (this.view === undefined) {
      return;
    }
    if (item === null) {
      return;
    }
    const codeData = item.check;
    if (codeData === undefined) {
      this.view.html = `
<h2>No check data available</h2>
`;
      return;
    }

    let html: string = baseHTML;
    switch (item.itemType) {
      case TrivyTreeItemType.misconfigCode:
      case TrivyTreeItemType.misconfigInstance:
        html += getMisconfigurationHtml(item.check);
        break;
      case TrivyTreeItemType.vulnerabilityCode:
        html += getVulnerabilityHtml(item.check);
        break;
      case TrivyTreeItemType.secretInstance:
        html += getSecretHtml(item.check);
        break;
      default:
        return '';
    }

    if (codeData.references) {
      html += '<ul>';
      for (let i = 0; i < codeData.references.length; i++) {
        const reference = codeData.references[i];
        html += `<li><a href="${reference}">${reference}</a></li>
            `;
      }
      html += '</ul>';
    }

    this.view.html = html;
    return;
  }
}

function getVulnerabilityHtml(result: TrivyResult): string {
  const vulnerability = result.extraData as Vulnerability;
  if (vulnerability === undefined) {
    return '';
  }
  return `
    <h2>${result.title}</h2>
    
    <h3>${result.id}</h3>
    ${result.description}

    <br />
    <br /> 
    <table>
    <tr>
    <th>Severity</th>
    <td>${result.severity}</td>
    </tr>
    <tr>
    <th>Package Name</th>
    <td>${vulnerability.pkgName}</td>
    </tr>
    <tr>
    <th>Installed Version</th>
    <td>${vulnerability.installedVersion}</td>
    </tr>
    <tr>
    <th>Fixed Version</th>
    <td>${vulnerability.fixedVersion}</td>
    </tr>
    <tr>
    <th>Filename</th>
    <td>${result.filename}</td>
    </tr>
    </table>

    <h4>More Information</h4>
    `;
}

function getMisconfigurationHtml(result: TrivyResult): string {
  const misconfig = result.extraData as Misconfiguration;
  if (misconfig === undefined) {
    return '';
  }
  return `
    <h2>${result.title}</h2>
    
    <h3>${result.id}</h3>
    ${result.description}

    <br />
    <br /> 
    <table>
    <tr>
    <th>Severity</th>
    <td>${result.severity}</td>
    </tr>
    <tr>
    <th>Resolution</th>
    <td>${misconfig.resolution}</td>
    </tr>
    <tr>
    <th>Filename</th>
    <td>${result.filename}</td>
    </tr>
    </table>

    <h4>More Information</h4>
    `;
}

function getSecretHtml(result: TrivyResult): string {
  const secret = result.extraData as Secret;
  if (secret === undefined) {
    return '';
  }
  return `
    <h2>${result.title}</h2>

<br />
    <br /> 
    <table>
    <tr>
    <th>Severity</th>
    <td>${result.severity}</td>
    </tr>
    <tr>
    <th>Match</th>
    <td>${secret.match}</td>
    </tr>
    <tr>
    <th>Filename</th>
    <td>${result.filename}</td>
    </tr>
    </table>


    `;
}
