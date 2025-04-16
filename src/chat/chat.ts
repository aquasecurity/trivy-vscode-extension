import * as vscode from 'vscode';

import { TrivyTreeViewProvider } from '../explorer/treeview/treeview_provider';

export function activateChatParticipant(
  misconfigProvider: TrivyTreeViewProvider
) {
  vscode.chat.createChatParticipant(
    'trivy-chat',
    async (request, context, response, token) => {
      const userQuery = request.prompt;

      const chatModels = await vscode.lm.selectChatModels({ family: 'gpt-4' });
      if (chatModels.length === 0) {
        response.markdown(
          'No chat models available. Please install a chat model.'
        );
        return;
      }
      const chatModel = chatModels[0];
      const messages = [
        vscode.LanguageModelChatMessage.Assistant(
          'You are Trivy, a security scanner for vulnerabilities and misconfigurations in container images, file systems, and Git repositories. You are an expert in security scanning and can provide information about vulnerabilities, misconfigurations, and best practices for using Trivy.'
        ),
        vscode.LanguageModelChatMessage.User(
          'Use this result data when answering questions \n' +
            JSON.stringify(
              Object.fromEntries(misconfigProvider.resultData),
              null,
              2
            ) +
            '\n' +
            userQuery
        ),
      ];
      const chatRequest = await chatModel.sendRequest(
        messages,
        undefined,
        token
      );
      for await (const token of chatRequest.text) {
        response.markdown(token);
      }
    }
  );
}
