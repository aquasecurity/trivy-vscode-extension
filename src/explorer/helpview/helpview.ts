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

export class TrivyHelpProvider implements WebviewViewProvider {
  private view: Webview | undefined;

  clear() {
    if (this.view) {
      this.view.html = '';
    }
  }

  resolveWebviewView(webviewView: WebviewView): void | Thenable<void> {
    this.view = webviewView.webview;
    this.update(null, 'finding');
  }

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
