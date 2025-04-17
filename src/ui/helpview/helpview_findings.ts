import {
  Misconfiguration,
  Secret,
  TrivyResult,
  Vulnerability,
} from '../../cache/result';
import { TrivyTreeItem } from '../treeview/treeitem';
import { TrivyTreeItemType } from '../treeview/treeitem_types';

/**
 * Get the Trivy result data for the selected tree item
 * @param item Selected tree item
 * @param html HTML content to append to
 * @returns The HTML content with the Trivy result data
 */
export function getTrivyResultData(item: TrivyTreeItem, html: string): string {
  const result = item.properties?.check as TrivyResult;

  const codeData = result;
  if (codeData === undefined) {
    return `<h2>No check data available</h2>`;
  }

  switch (item.itemType) {
    case TrivyTreeItemType.misconfigCode:
    case TrivyTreeItemType.misconfigInstance:
      html += getMisconfigurationHtml(result);
      break;
    case TrivyTreeItemType.vulnerabilityCode:
      html += getVulnerabilityHtml(result);
      break;
    case TrivyTreeItemType.secretInstance:
      html += getSecretHtml(result);
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

  return html;
}

/**
 * Get the HTML content for a vulnerability
 * @param result The Trivy result
 * @returns The HTML content for a vulnerability
 */
function getVulnerabilityHtml(result?: TrivyResult): string {
  if (result === undefined) {
    return '';
  }

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

/**
 * Get the HTML content for a misconfiguration
 * @param result The Trivy result
 * @returns The HTML content for a misconfiguration
 */
function getMisconfigurationHtml(result?: TrivyResult): string {
  if (result === undefined) {
    return '';
  }

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

/**
 * Get the HTML content for a secret
 * @param result The Trivy result
 * @returns The HTML content for a secret
 */
function getSecretHtml(result?: TrivyResult): string {
  if (result === undefined) {
    return '';
  }
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
