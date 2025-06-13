export const FOCUS_RULE_ID_OFFSET = 1000;

export const generateBlockingRules = (domains) => {
    return domains.map((domain, index) => ({
        id: FOCUS_RULE_ID_OFFSET + index,
        priority: 1,
        action: {
            type: "redirect",
            redirect: {
                extensionPath: "/blocked.html"
            }
        },
        condition: {
            urlFilter: `||${domain}^`,
            resourceTypes: ["main_frame"]
        }
    }));
};


export const getFocusRuleIds = (count) => {
    return Array.from({ length: count }, (_, i) => 1000 + i);
};
