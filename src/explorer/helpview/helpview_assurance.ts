import { PolicyResult } from '../result';
import { TrivyTreeItem } from '../treeview/treeitem';

const tick = '✅';
const cross = '❌';

/**
 * Get the policy data for the selected tree item
 * @param item Selected tree item
 * @param html HTML content to append to
 * @returns The HTML content with the policy data
 */
export function getPolicyData(item: TrivyTreeItem, html: string): string {
  const severityCalc = (sev: number): string => {
    switch (sev) {
      case 1:
        return 'LOW';
      case 2:
        return 'MEDIUM';
      case 3:
        return 'HIGH';
      case 4:
        return 'CRITICAL';
      default:
        return 'UNKNOWN';
    }
  };

  const result = item.properties?.check as PolicyResult;
  let code = result.avdId;
  if (result.avdId !== result.matchCode) {
    code = `${result.avdId}`;
  }

  html += `
    <h2>${result.title}</h2>
    
    <h3>${code}</h3>
    ${result.description}

    <br />
    <br /> 
    <table>
    <tr>
    <th>Severity</th>
    <td>${severityCalc(Number(result.severity))}</td>
    </tr>
    ${
      result.pkgName
        ? `<tr>
    <th>Package</th>
    <td>${result.pkgName}</td>
    </tr>`
        : ''
    }
    <tr>
    <th>Fix</th>
    <td>${result.fix}</td>
    </tr>
    <tr>
    <th>Policy Passed</th>
    <td>${result.failed ? cross : tick}</td>
    </tr>
    <tr>
    <th>Filename</th>
    <td>${result.filename}</td>
    </tr>
    </table>


    <h4>More Information</h4>
    <ul>
    <li><a href="https://cloud-dev.aquasec.com/ah/#/supplychain/policies/${result.id}">Aqua Platform (${result.avdId})</a></li>
    `;

  if (result.references) {
    for (let i = 0; i < result.references.length; i++) {
      const reference = result.references[i];
      html += `<li><a href="${reference}">${reference}</a></li>
            `;
    }
  }

  html += '</ul>';
  return html;
}
