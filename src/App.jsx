import { useEffect, useState } from "react";
import CustomizeCategoriesModal from './components/CustomizeCategoriesModal';
import { generateBlockingRules, getFocusRuleIds } from "./utils/focusBlocker";


const App = () => {
  const defaultCategories = {
    "Social Media": [
      "facebook.com",
      "x.com",
      "twitter.com",
      "instagram.com",
      "linkedin.com",
      "snapchat.com",
      "tiktok.com",
      "reddit.com",
    ],
    "AI Tools": [
      "chat.openai.com",
      "bard.google.com",
      "copilot.microsoft.com",
      "notion.ai",
      "perplexity.ai",
    ],
    "Search Engines": [
      "google.com",
      "bing.com",
      "duckduckgo.com",
      "yahoo.com",
    ],
    "Communication": [
      "gmail.com",
      "mail.google.com",
      "outlook.com",
      "discord.com",
      "slack.com",
      "telegram.org",
      "whatsapp.com",
    ],
    "News & Media": [
      "bbc.com",
      "cnn.com",
      "nytimes.com",
      "indiatoday.in",
      "theguardian.com",
      "hindustantimes.com",
    ],
  };

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("customCategories");
    return saved ? JSON.parse(saved) : defaultCategories;
  });
  const [focusMode, setFocusMode] = useState(() => {
    return JSON.parse(localStorage.getItem("focusMode")) || false;
  });

  const [showModal, setShowModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    localStorage.setItem("focusMode", JSON.stringify(focusMode));
  }, [focusMode]);

  useEffect(() => {
    localStorage.setItem("customCategories", JSON.stringify(categories));
  }, [categories]);

  const getCategory = (hostname) => {
    for (const [category, sites] of Object.entries(categories)) {
      if (sites.some((site) => hostname.includes(site))) {
        return category;
      }
    }
    return "Others";
  };

  const calculateCategoryCounts = (historyItems) => {
    const categoryCounts = {};

    historyItems.forEach((item) => {
      const hostname = new URL(item.url).hostname;
      const category = getCategory(hostname);

      if (!categoryCounts[category]) {
        categoryCounts[category] = 0;
      }

      categoryCounts[category] += 1;
    });

    const sortedCategoryData = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return sortedCategoryData;
  };

  useEffect(() => {
    const fetchHistory = async () => {
      const now = new Date();
      let startTime;

      if (activeTab === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startTime = today.getTime();
      } else if (activeTab === "7days") {
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime();
      } else if (activeTab === "30days") {
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();
      }

      chrome.history.search(
        { text: "", startTime: startTime, maxResults: 10000 },
        (results) => {
          const visitCounts = {};

          results.forEach((item) => {
            const hostname = new URL(item.url).hostname;
            if (!visitCounts[hostname]) {
              visitCounts[hostname] = {
                count: 0,
                lastVisitTime: item.lastVisitTime,
              };
            }

            visitCounts[hostname].count += 1;

            if (
              item.lastVisitTime &&
              item.lastVisitTime > visitCounts[hostname].lastVisitTime
            ) {
              visitCounts[hostname].lastVisitTime = item.lastVisitTime;
            }
          });

          const sortedData = Object.entries(visitCounts)
            .map(([site, data]) => ({
              site,
              count: data.count,
              lastVisited: new Date(data.lastVisitTime),
            }))
            .sort((a, b) => b.count - a.count);

          setHistoryData(sortedData);

          const sortedCategories = calculateCategoryCounts(results);
          setCategoryData(sortedCategories);
        }
      );
    };

    fetchHistory();
  }, [activeTab, categories]);


  useEffect(() => {
    const updateBlockingRules = async () => {
      const focusCategorySites = categories["Social Media"] || [];

      const ruleIds = getFocusRuleIds(focusCategorySites.length);

      if (focusMode) {
        const rules = generateBlockingRules(focusCategorySites);

        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: rules,
        });
      } else {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: [],
        });
      }
    };

    updateBlockingRules();
  }, [focusMode, categories]);



  return (
    <div className="p-4 text-sm w-screen min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Web Story – Your Browsing Adventure
      </h1>

      <div className="flex justify-center mt-4 mb-6">
        <button
          onClick={() => setFocusMode(prev => !prev)}
          className={`px-6 py-2 rounded-full font-semibold transition-colors duration-200 ${focusMode ? "bg-red-500 text-white" : "bg-green-500 text-white"
            }`}
        >
          {focusMode ? "Stop Focus Mode 🔓" : "Start Focus Mode 🔒"}
        </button>
      </div>


      <div className="flex justify-center gap-4 mb-6">
        {["today", "7days", "30days"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-md font-medium ${activeTab === tab
              ? "bg-blue-500 text-white"
              : "bg-gray-300 text-gray-800"
              }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "today" && "Today"}
            {tab === "7days" && "Last 7 Days"}
            {tab === "30days" && "Last 30 Days"}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-8 px-4">
        {/* Top Sites Card */}
        <div className="bg-white shadow-md rounded-xl p-6 w-full md:w-1/2">
          <h2 className="text-lg font-semibold mb-4">Top 10 Sites</h2>
          <ul className="space-y-2">
            {historyData.slice(0, 10).map((item, idx) => (
              <li key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img
                    src={`https://www.google.com/s2/favicons?sz=64&domain=${item.site}`}
                    alt=""
                    className="w-5 h-5"
                  />
                  <a
                    href={`https://${item.site}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {item.site}
                  </a>
                </div>
                <span className="text-gray-600">{item.count} visits</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 text-gray-700 space-y-1">
            <div>
              <strong>Total Sites Visited:</strong>{" "}
              {historyData.reduce((sum, item) => sum + item.count, 0)} visits
            </div>
            <div>
              <strong>Unique Domains:</strong> {historyData.length} domains
            </div>
          </div>
        </div>
        {/* Categories Summary Card */}
        <div className="bg-white shadow-md rounded-xl p-6 w-full md:w-1/3 relative">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Categories</h2>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md w-full"
            >
              Customize Categories
            </button>
          </div>
          <ul className="space-y-2">
            {categoryData.map((item, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {item.category === "Social Media" && "👥"}
                    {item.category === "AI Tools" && "🤖"}
                    {item.category === "Search Engines" && "🔍"}
                    {item.category === "Communication" && "💬"}
                    {item.category === "News & Media" && "📰"}
                    {item.category === "Others" && "📁"}
                  </span>
                  <span>{item.category}</span>
                </div>
                <span className="text-gray-600">{item.count} visits</span>
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Category Editor */}
      {showModal && (
        <CustomizeCategoriesModal
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowModal(false)}
        />
      )}


    </div>
  );
};

export default App;
