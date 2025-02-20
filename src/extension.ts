import * as vscode from 'vscode';

interface TabState {
    uri: string;
    viewColumn?: number;
}

interface SessionState {
    name: string;
    tabs: TabState[];
}

export function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "vscode-session-manager" is now active!');

    const disposable = vscode.commands.registerCommand('vscode-session-manager.saveSession', async () => {
        const sessionName = await vscode.window.showInputBox({ prompt: 'Enter a name for this session' });
        if (!sessionName) {
            vscode.window.showWarningMessage('Session name is required!');
            return;
        }

        // Save the current state
        const state: SessionState = {
            name: sessionName,
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

        // Retrieve existing sessions
        const existingSessions = context.workspaceState.get<SessionState[]>('savedSessions', []);
        existingSessions.push(state);

        // Save state to workspace storage
        await context.workspaceState.update('savedSessions', existingSessions);

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

        vscode.window.showInformationMessage(`Session "${sessionName}" saved!`);
    });

    const disposable2 = vscode.commands.registerCommand('vscode-session-manager.restoreSession', async () => {
        const savedSessions = context.workspaceState.get<SessionState[]>('savedSessions', []);
        
        if (savedSessions.length === 0) {
            vscode.window.showWarningMessage('No saved sessions found!');
            return;
        }

        const sessionNames = savedSessions.map(session => session.name);
        const selectedSessionName = await vscode.window.showQuickPick(sessionNames, { placeHolder: 'Select a session to restore' });

        if (!selectedSessionName) {
            return;
        }

        const selectedSession = savedSessions.find(session => session.name === selectedSessionName);

        if (!selectedSession) {
            vscode.window.showWarningMessage('Selected session not found!');
            return;
        }

        // Restore tabs
        await Promise.all(
            selectedSession.tabs.map(async (tabState) => {
                const uri = vscode.Uri.parse(tabState.uri);
                await vscode.window.showTextDocument(uri, {
                    viewColumn: tabState.viewColumn,
                    preview: false
                });
            })
        );

        vscode.window.showInformationMessage(`Session "${selectedSessionName}" restored!`);
    });

    context.subscriptions.push(disposable, disposable2);
}

export function deactivate() {}