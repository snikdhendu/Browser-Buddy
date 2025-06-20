"use client"

import { useEffect, useState } from "react"
import CustomizeCategoriesModal from "./components/CustomizeCategoriesModal"
import { generateBlockingRules, getFocusRuleIds } from "./utils/focusBlocker"
import { BarChart, Layout, Settings, Shield, Zap, Star } from "lucide-react"
import PerformanceMetrics from "./components/PerformanceMetrics"

// Declare chrome variable for use in non-chrome environments (e.g., testing, development)
// declare const chrome: any

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
    "AI Tools": ["chat.openai.com", "bard.google.com", "copilot.microsoft.com", "notion.ai", "perplexity.ai"],
    "Search Engines": ["google.com", "bing.com", "duckduckgo.com", "yahoo.com"],
    Communication: [
      "gmail.com",
      "mail.google.com",
      "outlook.com",
      "discord.com",
      "slack.com",
      "telegram.org",
      "whatsapp.com",
    ],
    "News & Media": ["bbc.com", "cnn.com", "nytimes.com", "indiatoday.in", "theguardian.com", "hindustantimes.com"],
  }

  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem("customCategories")
    return saved ? JSON.parse(saved) : defaultCategories
  })
  const [focusMode, setFocusMode] = useState(() => {
    const savedFocusMode = localStorage.getItem("focusMode");
    return savedFocusMode ? JSON.parse(savedFocusMode) : false;
  });

  const [showModal, setShowModal] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [activeTab, setActiveTab] = useState("today")
  const [isLoading, setIsLoading] = useState(true)
  const [focusTimer, setFocusTimer] = useState(0); // in seconds
  const [totalFocusTime, setTotalFocusTime] = useState(() => {
    const saved = localStorage.getItem("totalFocusTime");
    // Check if we're still on the same day
    const lastDate = localStorage.getItem("lastFocusDate");
    const today = new Date().toDateString();

    if (lastDate === today) {
      return saved ? parseInt(saved) : 0;
    } else {
      return 0; // Reset if it's a new day
    }
  });
  const [timerInterval, setTimerInterval] = useState(null);

  useEffect(() => {
    localStorage.setItem("focusMode", JSON.stringify(focusMode));

    if (focusMode) {
      const interval = setInterval(() => {
        setFocusTimer(prev => {
          const newTimer = prev + 1;
          return newTimer;
        });

        setTotalFocusTime(prev => {
          const updatedTotal = prev + 1;
          localStorage.setItem("totalFocusTime", updatedTotal.toString());
          localStorage.setItem("lastFocusDate", new Date().toDateString());
          return updatedTotal;
        });
      }, 1000);

      setTimerInterval(interval);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        setTimerInterval(null);
      }
      setFocusTimer(0);
    }

    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [focusMode]);


  const toggleFocusMode = () => {
    const newFocusMode = !focusMode;
    setFocusMode(newFocusMode);
    localStorage.setItem("focusMode", JSON.stringify(newFocusMode));
  };

  // Add this function to format the time for display
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  useEffect(() => {
    localStorage.setItem("customCategories", JSON.stringify(categories))
  }, [categories])

  const getCategory = (hostname) => {
    for (const [category, sites] of Object.entries(categories)) {
      if (sites.some((site) => hostname.includes(site))) {
        return category
      }
    }
    return "Others"
  }

  const calculateCategoryCounts = (historyItems) => {
    const categoryCounts = {}

    historyItems.forEach((item) => {
      const hostname = new URL(item.url).hostname
      const category = getCategory(hostname)

      if (!categoryCounts[category]) {
        categoryCounts[category] = 0
      }

      categoryCounts[category] += 1
    })

    const sortedCategoryData = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)

    return sortedCategoryData
  }

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true)
      const now = new Date()
      let startTime

      if (activeTab === "today") {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        startTime = today.getTime()
      } else if (activeTab === "7days") {
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000).getTime()
      } else if (activeTab === "30days") {
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime()
      }

      chrome.history.search({ text: "", startTime: startTime, maxResults: 10000 }, (results) => {
        const visitCounts = {}

        results.forEach((item) => {
          const hostname = new URL(item.url).hostname
          if (!visitCounts[hostname]) {
            visitCounts[hostname] = {
              count: 0,
              lastVisitTime: item.lastVisitTime,
            }
          }

          visitCounts[hostname].count += 1

          if (item.lastVisitTime && item.lastVisitTime > visitCounts[hostname].lastVisitTime) {
            visitCounts[hostname].lastVisitTime = item.lastVisitTime
          }
        })

        const sortedData = Object.entries(visitCounts)
          .map(([site, data]) => ({
            site,
            count: data.count,
            lastVisited: new Date(data.lastVisitTime),
          }))
          .sort((a, b) => b.count - a.count)

        setHistoryData(sortedData)

        const sortedCategories = calculateCategoryCounts(results)
        setCategoryData(sortedCategories)
        setIsLoading(false)
      })
    }

    fetchHistory()
  }, [activeTab, categories])

  useEffect(() => {
    const updateBlockingRules = async () => {
      const focusCategorySites = categories["Social Media"] || []

      const ruleIds = getFocusRuleIds(focusCategorySites.length)

      if (focusMode) {
        const rules = generateBlockingRules(focusCategorySites)

        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: rules,
        })
      } else {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIds,
          addRules: [],
        })
      }
    }

    updateBlockingRules()
  }, [focusMode, categories])

  const getCategoryIcon = (category) => {
    switch (category) {
      case "Social Media":
        return "📺"
      case "AI Tools":
        return "🤖"
      case "Search Engines":
        return "🔍"
      case "Communication":
        return "💬"
      case "News & Media":
        return "📰"
      case "Others":
        return "📂"
      default:
        return "🚀"
    }
  }

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-slate-100">
      <header className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 py-8 px-6 mb-6">
        {/* Subtle background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-50/30 via-transparent to-indigo-50/30 dark:from-purple-900/10 dark:via-transparent dark:to-indigo-900/10"></div>

        <div className="relative max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            {/* Brand Section */}
            <div className="flex items-center gap-6 group">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl blur-sm opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-r from-purple-500 to-indigo-600 p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <img src="/pic.png" alt="Browser Buddy" className="h-14 w-14 rounded-lg" />
                </div>
              </div>

              <div className="flex flex-col">
                <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                  Browser Buddy
                </h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  Reclaim Your Time, One Tab at a Time.
                </p>
              </div>
            </div>

            {/* Stats & Controls Section */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Focus Time Badge */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-xl blur-sm"></div>
                <div className="relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-700 dark:to-slate-600 border border-indigo-200/50 dark:border-slate-600 py-3 px-5 rounded-xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      Focus time today: {formatTime(totalFocusTime)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Focus Mode Toggle */}
                <div className="group relative">
                  <button
                    onClick={toggleFocusMode}
                    className={`relative overflow-hidden px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${focusMode
                      ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                      : "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                      }`}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative flex items-center gap-2.5">
                      {focusMode ? (
                        <>
                          <Shield className="w-4 h-4" />
                          <span className="hidden sm:inline">Stop Focus</span>
                          <span className="font-mono text-sm">({formatTime(focusTimer)})</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Start Focus Mode</span>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Enhanced Tooltip */}
                  <div className="absolute w-xl top-full left-1/2 transform -translate-x-1/2 mt-3 z-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-y-1">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs py-3 px-4 rounded-lg shadow-xl border border-slate-700 w-300">
                      <p className="leading-relaxed w-[180px]">
                        Enable focus mode to temporarily block all social media sites and stay productive
                      </p>
                      <div className="w-3 h-3 bg-slate-900 dark:bg-slate-800 border-l border-t border-slate-700 transform rotate-45 absolute left-1/2 -top-1.5 -ml-1.5"></div>
                    </div>
                  </div>
                </div>

                {/* GitHub Star Button */}
                <a
                  href="https://github.com/snikdhendu/Browser-Buddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2.5 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative flex items-center gap-2.5">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {/* <Github className="w-4 h-4" /> */}
                    <span className="hidden sm:inline">Star on GitHub</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pb-12">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-4 mb-8">
          <div className="flex justify-center gap-2 mb-2">
            {["today", "7days", "30days"].map((tab) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${activeTab === tab
                  ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "today" && "Today"}
                {tab === "7days" && "Last 7 Days"}
                {tab === "30days" && "Last 30 Days"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-slate-700 dark:to-slate-700 p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Visits</h3>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {isLoading ? "..." : formatNumber(historyData.reduce((sum, item) => sum + item.count, 0))}
                </p>
              </div>
              <div className="bg-purple-100 dark:bg-slate-600 p-3 rounded-full">
                <BarChart className="w-5 h-5 text-purple-600 dark:text-purple-300" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-700 dark:to-slate-700 p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Unique Domains</h3>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {isLoading ? "..." : formatNumber(historyData.length)}
                </p>
              </div>
              <div className="bg-indigo-100 dark:bg-slate-600 p-3 rounded-full">
                <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-700 dark:to-slate-700 p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Categories</h3>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {isLoading ? "..." : categoryData.length}
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-slate-600 p-3 rounded-full">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Sites Card */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 shadow-md rounded-xl overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <BarChart className="w-5 h-5 text-purple-600" /> Top 10 Sites
              </h2>
              <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {isLoading ? "Loading..." : `${historyData.length} domains`}
              </span>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {historyData.slice(0, 10).map((item, idx) => (
                    <li key={idx} className="py-3 flex justify-between items-center group">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-5">#{idx + 1}</span>
                        <div className="bg-slate-100 dark:bg-slate-700 rounded-md p-1.5 flex-shrink-0">
                          <img
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${item.site}`}
                            alt=""
                            className="w-4 h-4"
                          />
                        </div>
                        <a
                          href={`https://${item.site}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                        >
                          {item.site}
                        </a>
                      </div>
                      <div className="flex items-center justify-between w-[180px]">
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium text-right tabular-nums min-w-[70px]">
                          {formatNumber(item.count)} visits
                        </span>

                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
                          {getCategory(item.site)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Categories Summary Card */}
          <div className="bg-white dark:bg-slate-800 shadow-md rounded-xl overflow-hidden">
            <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-600" /> Categories
              </h2>
            </div>

            <div className="p-6">
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <>
                  <ul className="space-y-3 mb-6">
                    {categoryData.map((item, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-700/50 p-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-lg">
                            {getCategoryIcon(item.category)}
                          </div>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.category}</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-16 bg-slate-100 dark:bg-slate-700 rounded-full h-2 mr-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (item.count / categoryData[0].count) * 100)}%`,
                              }}
                            ></div>
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400">{formatNumber(item.count)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center justify-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Customize Categories
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </main>


      {/* Category Editor */}
      {showModal && (
        <CustomizeCategoriesModal
          categories={categories}
          setCategories={setCategories}
          onClose={() => setShowModal(false)}
        />
      )}

      <PerformanceMetrics
        categories={categories}
        activeTab={activeTab}
      />
      <footer className="bg-white dark:bg-slate-800 shadow-md py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center">
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-2 sm:mb-0 flex gap-1">Made by
            <a
              href="https://www.snikdhendu.me/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex font-extrabold items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Snikdhendu Pramanik
            </a>
          </p>
          <a
            href="https://x.com/snikdhendu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            Follow on X
          </a>
        </div>
      </footer>
    </div>



  )
}

export default App
