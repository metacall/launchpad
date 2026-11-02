export function generateMetaCallReply(userText: string): string {
  const text = userText.toLowerCase();

  if (/deploy|deployment|zip|package/.test(text)) {
    return 'To deploy a package, open Deployments, choose “New Deploy”, and upload a ZIP containing your source files or a repository configuration. The deploy page will guide you through the language and package setup.';
  }
  if (/log/.test(text)) {
    return 'Open the deployment details and use the Logs view to follow output. Logs stop polling automatically when a deployment reaches a terminal state.';
  }
  if (/inspect|status|running|deployment list/.test(text)) {
    return 'Use the Deployments page to inspect a deployment. Select a deployment name to view its details, build status, packages, ports, and available endpoint.';
  }
  if (/call|execute|invoke|function/.test(text)) {
    return 'Open a deployment’s detail page, select a function, and use the Inspect/Call interface to provide arguments. MetaCall functions are addressed by deployment, version, and function name.';
  }
  if (/plan|billing|subscription|quota/.test(text)) {
    return 'You can review or change plans from the Plan page. Account settings also show subscription details and available deployment slots.';
  }
  if (/hello|hi|hey/.test(text)) {
    return 'Hello! I can help with deployment, function inspection, function calls, logs, plans, and troubleshooting in Launchpad.';
  }
  if (/error|failed|troubleshoot|debug/.test(text)) {
    return 'Check the deployment status and Logs first. Verify that your package format, function entry point, and metacall.json configuration are valid, then retry the deployment.';
  }
  if (/\b(help|support|metacall)\b/.test(text)) {
    return 'I can help with deploying ZIPs or repositories, inspecting deployments, calling functions, reading logs, and choosing plans. What would you like to do?';
  }

  return 'I can help with MetaCall deployments, function inspection, function execution, logs, plans, and troubleshooting. Try asking about “deploy a ZIP”, “call a function”, or “view logs”.';
}
