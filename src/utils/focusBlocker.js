export const FOCUS_RULE_ID_OFFSET = 1000;

export const generateBlockingRules = (domains) => {
    return domains.map((domain, index) => ({
        id: 1000 + index,
        priority: 1,
        action: {
            type: "redirect",
            redirect: {
                // redirect to a custom HTML page inside your extension
                extensionPath: "/blocked.html"
            }
        },
        condition: {
            urlFilter: `||${domain}^`, // This matches domain + subpages
            resourceTypes: ["main_frame"]
        }
    }));
};

export const getFocusRuleIds = (count) => {
    return Array.from({ length: count }, (_, i) => 1000 + i);
};
