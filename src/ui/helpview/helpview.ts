import { Webview, WebviewView, WebviewViewProvider } from 'vscode';

import { TrivyTreeItem } from '../treeview/treeitem';
import { explorerType } from '../treeview/treeview_provider';

import { getPolicyData } from './helpview_assurance';
import { getTrivyResultData } from './helpview_findings';

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

th {
  padding-right: 10px;
  align-self: top;
  }

</style>
`;

/**
 * Help provider for Trivy tree view
 */
export class TrivyHelpProvider implements WebviewViewProvider {
  private view: Webview | undefined;

  /**
   * Clear the help view
   */
  clear() {
    if (this.view) {
      this.view.html = '';
    }
  }

  /**
   * Resolve the webview view
   * @param webviewView Webview view
   */
  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    this.view = webviewView.webview;
    this.update(null, 'finding');
  }

  /**
   * Update the help view with the data from the selected tree item
   * @param item Selected tree item
   * @param explorerType Type of tree view
   */
  update(item: TrivyTreeItem | null, explorerType: explorerType): void {
    if (this.view === undefined) {
      return;
    }
    if (item === null) {
      return;
    }

    let html: string = baseHTML;
    switch (explorerType) {
      case 'finding':
        html = getTrivyResultData(item, html);
        break;
      case 'policy':
        html = getPolicyData(item, html);
        break;
    }

    this.view.html = html;
    return;
  }
}
