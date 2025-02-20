import * as vscode from 'vscode';

interface TabState {
    uri: string;
    viewColumn?: number;
}

interface SessionState {
    tabs: TabState[];
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-session-manager" is now active!');

    const disposable = vscode.commands.registerCommand('vscode-session-manager.saveSession', async () => {
        // Save the current state
        const state: SessionState = {
            tabs: vscode.window.tabGroups.all.flatMap(group => 
                group.tabs
                    .filter(tab => tab.input instanceof vscode.TabInputText)
                    .map(tab => {
                        return {
                            uri: (tab.input as vscode.TabInputText).uri.toString(),
                            viewColumn: group.viewColumn
                        };
                    })
                    
            )
        };
        
        // Save state to workspace storage
        await context.workspaceState.update('savedSession', state);
        
        // Close all tabs in all groups
        await Promise.all(
            vscode.window.tabGroups.all.map(async (tabGroup) => {
                await Promise.all(
                    tabGroup.tabs.map(async (tab) => {
                        await vscode.window.tabGroups.close(tab);
                    })
                );
            })
        );

        vscode.window.showInformationMessage('Session saved!');
    });

    const disposable2 = vscode.commands.registerCommand('vscode-session-manager.restoreSession', async () => {
        const savedState = context.workspaceState.get<SessionState>('savedSession');
        
        if (!savedState) {
            vscode.window.showWarningMessage('No saved session found!');
            return;
        }

        // Restore tabs
        await Promise.all(
            savedState.tabs.map(async (tabState) => {
                const uri = vscode.Uri.parse(tabState.uri);
                await vscode.window.showTextDocument(uri, {
                    viewColumn: tabState.viewColumn,
                    preview: false
                });
            })
        );

        vscode.window.showInformationMessage('Session restored!');
    });

    context.subscriptions.push(disposable, disposable2);
}

export function deactivate() {}