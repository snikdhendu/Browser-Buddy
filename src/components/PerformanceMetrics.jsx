"use client"

import { useState, useEffect } from "react"
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, TrendingDown, Info } from "lucide-react"

// Declare chrome variable for environments where it's not automatically available (e.g., testing)
const chrome =
    typeof window !== "undefined" && window.chrome
        ? window.chrome
        : {
            history: {
                search: (query, callback) => {
                    // Provide a mock implementation for testing or non-extension environments
                    console.warn("chrome.history.search is not available in this environment. Providing mock data.")
                    const mockData = [] // Replace with your mock data if needed
                    callback(mockData)
                },
            },
        }

const PerformanceMetrics = ({ categories, activeTab }) => {
    const [dailyStats, setDailyStats] = useState([])
    const [trendData, setTrendData] = useState({})
    const [isLoading, setIsLoading] = useState(true)
    const [hoveredBar, setHoveredBar] = useState(null)
    const [showScoreInfo, setShowScoreInfo] = useState(false)

    useEffect(() => {
        const fetchDailyMetrics = async () => {
            setIsLoading(true)
            const endDate = new Date() // Today
            const startDate = new Date()
            startDate.setDate(endDate.getDate() - 6) // Last 6 days + today = 7 days total

            // Get timestamps for the last 7 days (including today)
            const dayTimestamps = []
            for (let i = 0; i < 7; i++) {
                const date = new Date()
                date.setDate(endDate.getDate() - 6 + i)
                date.setHours(0, 0, 0, 0)

                const isToday = i === 6
                const isYesterday = i === 5
                const dayName = isToday
                    ? "Today"
                    : isYesterday
                        ? "Yesterday"
                        : date.toLocaleDateString("en-US", { weekday: "short" })

                dayTimestamps.push({
                    day: dayName,
                    date: new Date(date.getTime()),
                    startTime: date.getTime(),
                    endTime: new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1).getTime(),
                })
            }

            // Prepare array to store daily data
            const dailyCategoryData = dayTimestamps.map((day) => ({
                day: day.day,
                date: new Date(day.startTime),
                categories: {},
                totalVisits: 0,
            }))

            // Fetch history for the entire 7-day period
            chrome.history.search(
                {
                    text: "",
                    startTime: startDate.getTime(),
                    maxResults: 10000,
                },
                (historyItems) => {
                    // Process each history item
                    historyItems.forEach((item) => {
                        const itemDate = new Date(item.lastVisitTime)
                        const dayIndex = dayTimestamps.findIndex(
                            (day) => item.lastVisitTime >= day.startTime && item.lastVisitTime <= day.endTime,
                        )

                        if (dayIndex !== -1) {
                            const hostname = new URL(item.url).hostname
                            let category = "Others"

                            // Find the category for this URL
                            for (const [cat, sites] of Object.entries(categories)) {
                                if (sites.some((site) => hostname.includes(site))) {
                                    category = cat
                                    break
                                }
                            }

                            // Increment the count for this category on this day
                            if (!dailyCategoryData[dayIndex].categories[category]) {
                                dailyCategoryData[dayIndex].categories[category] = 0
                            }
                            dailyCategoryData[dayIndex].categories[category] += 1
                            dailyCategoryData[dayIndex].totalVisits += 1
                        }
                    })

                    // Calculate trends (changes from the first day to latest)
                    const categoryTrends = calculateTrends(dailyCategoryData)

                    setDailyStats(dailyCategoryData)
                    setTrendData(categoryTrends)
                    setIsLoading(false)
                },
            )
        }

        fetchDailyMetrics()
    }, [categories, activeTab])

    // Calculate trends for each category
    const calculateTrends = (dailyData) => {
        const trends = {}
        const allCategories = new Set()

        // Get all unique categories first
        dailyData.forEach((day) => {
            Object.keys(day.categories).forEach((cat) => allCategories.add(cat))
        })

        // For each category, calculate the trend
        allCategories.forEach((category) => {
            // Get first few days average (to reduce variability)
            const firstThreeDays = dailyData.slice(0, 3)
            const firstDaysAvg = firstThreeDays.reduce((sum, day) => sum + (day.categories[category] || 0), 0) / 3

            // Get latest days average (including today)
            const latestThreeDays = dailyData.slice(-3)
            const latestDaysAvg = latestThreeDays.reduce((sum, day) => sum + (day.categories[category] || 0), 0) / 3

            // Calculate change percentage
            let changePercent = 0
            if (firstDaysAvg > 0 && latestDaysAvg > 0) {
                changePercent = ((latestDaysAvg - firstDaysAvg) / firstDaysAvg) * 100
            }

            // Determine if this change is positive or negative based on category
            let isPositive = changePercent > 0

            // For social media, a decrease is positive performance
            if (category === "Social Media") {
                isPositive = changePercent < 0
            }

            // For productive categories like Search Engines, News & Media, AI Tools, an increase is positive
            if (["Search Engines", "News & Media", "AI Tools"].includes(category)) {
                isPositive = changePercent > 0
            }

            trends[category] = {
                change: Math.abs(changePercent).toFixed(1),
                isPositive,
                firstValue: firstDaysAvg.toFixed(0),
                latestValue: latestDaysAvg.toFixed(0),
            }
        })

        return trends
    }

    // Helper to get maximum value for chart scaling
    const getMaxCategoryValue = () => {
        let max = 0
        dailyStats.forEach((day) => {
            if (day.totalVisits > max) max = day.totalVisits
        })
        return max === 0 ? 100 : max // Default to 100 if no data
    }

    // Get category colors for the chart
    const getCategoryColor = (category) => {
        switch (category) {
            case "Social Media":
                return "bg-gradient-to-r from-pink-500 to-rose-500"
            case "AI Tools":
                return "bg-gradient-to-r from-cyan-500 to-teal-500"
            case "Search Engines":
                return "bg-gradient-to-r from-blue-500 to-indigo-500"
            case "Communication":
                return "bg-gradient-to-r from-purple-500 to-fuchsia-500"
            case "News & Media":
                return "bg-gradient-to-r from-amber-500 to-orange-500"
            case "Others":
                return "bg-gradient-to-r from-yellow-400 to-yellow-600"
            default:
                return "bg-gradient-to-r from-gray-400 to-gray-600"
        }
    }


    // Calculate height for a category segment in the stacked bar
    const calculateBarHeight = (count, maxValue) => {
        const maxHeight = 48 // Base height in tailwind units (12rem = 48 units of 0.25rem)
        return maxValue === 0 ? 0 : (count / maxValue) * maxHeight
    }

    // Get today's data only
    const getTodayData = () => {
        return dailyStats.find((day) => day.day === "Today") || { categories: {}, totalVisits: 0 }
    }

    // Get yesterday's data only
    const getYesterdayData = () => {
        return dailyStats.find((day) => day.day === "Yesterday") || { categories: {}, totalVisits: 0 }
    }

    // Calculate performance score for a specific day
    const calculateDayPerformanceScore = (dayData) => {
        if (!dayData) return 0

        let score = 50 // Base score
        const socialMediaCount = dayData.categories["Social Media"] || 0
        const totalVisits = dayData.totalVisits || 1 // Avoid division by zero

        // Social media reduction contributes positively to score
        // Lower percentage of social media = higher score
        const socialMediaPercent = (socialMediaCount / totalVisits) * 100

        if (socialMediaPercent <= 10) {
            score += 30 // Excellent - very low social media usage
        } else if (socialMediaPercent <= 20) {
            score += 20 // Good - moderate social media usage
        } else if (socialMediaPercent <= 30) {
            score += 10 // Fair - higher social media usage
        } else {
            score -= 10 // Poor - very high social media usage
        }

        // Award points for diverse browsing activity
        const uniqueCategories = Object.keys(dayData.categories).length
        score += uniqueCategories * 5 // 5 points per category used

            // Award points for productive categories
            ;["Search Engines", "News & Media", "AI Tools"].forEach((cat) => {
                if (dayData.categories[cat] && dayData.categories[cat] > 0) {
                    score += 5 // 5 points per productive category used
                }
            })

        // Cap at 100
        return Math.min(100, Math.max(0, score))
    }

    // Get today's performance score
    const calculateTodayPerformanceScore = () => {
        return calculateDayPerformanceScore(getTodayData())
    }

    // Get yesterday's performance score
    const calculateYesterdayPerformanceScore = () => {
        return calculateDayPerformanceScore(getYesterdayData())
    }

    // Calculate score change compared to yesterday
    const getScoreChangeFromYesterday = () => {
        const todayScore = calculateTodayPerformanceScore()
        const yesterdayScore = calculateYesterdayPerformanceScore()

        return todayScore - yesterdayScore
    }

    // Format number with comma separators
    const formatNumber = (num) => {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    }

    // Get time of day (morning, afternoon, evening)
    const getTimeOfDay = () => {
        const hour = new Date().getHours()
        if (hour < 12) return "morning"
        if (hour < 18) return "afternoon"
        return "evening"
    }

    return (
        <div className="mt-8 bg-white dark:bg-[#151b2c] shadow-md rounded-xl overflow-hidden flex justify-center items-center">
            <div className=" w-4/5 flex justify-center items-center flex-col">
                <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center w-full ">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="w-5 h-5 text-[#8a5cf6]" /> Performance Metrics
                    </h2>
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-[#2a2d4a] text-purple-700 dark:text-[#c4b5fd] rounded-full">
                        Last 7 Days
                    </span>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8a5cf6]"></div>
                    </div>
                ) : (
                    <div className="p-6 w-full">
                        {/* Performance Score - Updated to show today's score plus comparison with yesterday */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                    Performance Score - Today ({getTimeOfDay()})
                                    <button
                                        className="text-slate-400 hover:text-purple-600 transition-colors"
                                        onClick={() => setShowScoreInfo(!showScoreInfo)}
                                        aria-label="Show score calculation info"
                                    >
                                        <Info className="w-4 h-4" />
                                    </button>
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                        {calculateTodayPerformanceScore()}%
                                    </span>

                                    {/* Show comparison with yesterday */}
                                    {getScoreChangeFromYesterday() !== 0 && (
                                        <span
                                            className={`text-xs flex items-center ${getScoreChangeFromYesterday() > 0 ? "text-green-500" : "text-red-500"}`}
                                        >
                                            {getScoreChangeFromYesterday() > 0 ? (
                                                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                                            ) : (
                                                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                                            )}
                                            {Math.abs(getScoreChangeFromYesterday())}% from yesterday
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#8a5cf6] to-[#6366f1] rounded-full"
                                    style={{ width: `${calculateTodayPerformanceScore()}%` }}
                                ></div>
                            </div>

                            {/* Info tooltip explaining score calculation */}
                            {showScoreInfo && (
                                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg text-xs text-slate-600 dark:text-slate-300">
                                    <h4 className="font-medium mb-1 text-[#8a5cf6] dark:text-[#c4b5fd]">How Your Score Is Calculated:</h4>
                                    <ul className="space-y-1 list-disc pl-4">
                                        <li>Base score: 50 points</li>
                                        <li>Social media usage: Lower usage gives up to +30 points</li>
                                        <li>Diverse browsing: +5 points per category visited</li>
                                        <li>
                                            Productive browsing: +5 points for each productive category (Search Engines, News & Media, AI Tools)
                                        </li>
                                    </ul>
                                    <p className="mt-1">Your score reflects today's browsing activity compared to yesterday's.</p>
                                </div>
                            )}
                        </div>

                        {/* Category Trends */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {Object.entries(trendData)
                                .slice(0, 4)
                                .map(([category, data]) => (
                                    <div
                                        key={category}
                                        className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`}></div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{category}</span>
                                        </div>
                                        <div
                                            className={`flex items-center gap-1 text-sm ${data.isPositive ? "text-green-500" : "text-red-500"}`}
                                        >
                                            {data.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            <span>{data.change}%</span>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* 7-Day Chart */}
                        <div className="mt-6">
                            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">7-Day Activity</h3>
                            <div className="relative">
                                {/* Y-axis labels */}
                                <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-slate-400">
                                    <span>{formatNumber(getMaxCategoryValue())}</span>
                                    <span>{formatNumber(Math.floor(getMaxCategoryValue() / 2))}</span>
                                    <span>0</span>
                                </div>

                                {/* Chart grid lines */}
                                <div className="ml-8 border-l border-t border-slate-200 dark:border-slate-700 h-48 relative">
                                    <div
                                        className="absolute w-full border-b border-slate-200 dark:border-slate-700"
                                        style={{ top: "0%" }}
                                    ></div>
                                    <div
                                        className="absolute w-full border-b border-slate-200 dark:border-slate-700"
                                        style={{ top: "50%" }}
                                    ></div>
                                    <div
                                        className="absolute w-full border-b border-slate-200 dark:border-slate-700"
                                        style={{ top: "100%" }}
                                    ></div>
                                </div>

                                {/* Chart bars */}
                                <div className="ml-8 flex justify-between h-48 items-end max-w-[90%] mx-auto">
                                    {dailyStats.map((day, dayIndex) => {
                                        const maxValue = getMaxCategoryValue()
                                        const categories = Object.entries(day.categories).sort(([catA], [catB]) => {
                                            // Sort categories to ensure they always stack in the same order
                                            const order = [
                                                "Social Media",
                                                "AI Tools",
                                                "Search Engines",
                                                "Communication",
                                                "News & Media",
                                                "Others",
                                            ]
                                            return order.indexOf(catA) - order.indexOf(catB)
                                        })

                                        // Calculate total height for visualization purposes
                                        const totalHeight = categories.reduce(
                                            (sum, [_, count]) => sum + calculateBarHeight(count, maxValue),
                                            0,
                                        )
                                        const isHighlighted = day.day === "Today"
                                        const isYesterday = day.day === "Yesterday"

                                        return (
                                            <div key={dayIndex} className="flex-1 flex flex-col-reverse relative group">
                                                {/* Total visits label */}
                                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium text-slate-600 dark:text-slate-300">
                                                    {formatNumber(day.totalVisits)}
                                                </div>

                                                {/* Stack the category bars for each day */}
                                                <div
                                                    className={`mx-2 flex flex-col-reverse ${isHighlighted ? "opacity-100" : isYesterday ? "opacity-90" : "opacity-80"}`}
                                                >
                                                    {categories.map(([category, count], catIndex) => {
                                                        const height = calculateBarHeight(count, maxValue)
                                                        return (
                                                            <div
                                                                key={`${dayIndex}-${category}`}
                                                                className={`${getCategoryColor(category)} w-full ${catIndex === 0 ? "rounded-b-sm" : ""} ${catIndex === categories.length - 1 ? "rounded-t-sm" : ""
                                                                    } relative`}
                                                                style={{ height: `${height * 0.25}rem` }}
                                                                onMouseEnter={() => setHoveredBar({ day: dayIndex, category })}
                                                                onMouseLeave={() => setHoveredBar(null)}
                                                            >
                                                                {/* Enhanced tooltip on hover - only show for specific category */}
                                                                {hoveredBar && hoveredBar.day === dayIndex && hoveredBar.category === category && (
                                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 z-10 pointer-events-none">
                                                                        <div className="bg-[#1e2338] text-white text-xs py-1.5 px-2.5 rounded shadow-lg border border-[#2a2d4a] min-w-[120px]">
                                                                            <div className="font-medium text-[#c4b5fd] mb-0.5">{category}</div>
                                                                            <div className="flex justify-between">
                                                                                <span>Visits:</span>
                                                                                <span className="font-medium">{count}</span>
                                                                            </div>
                                                                            <div className="flex justify-between">
                                                                                <span>% of day:</span>
                                                                                <span className="font-medium">
                                                                                    {Math.round((count / day.totalVisits) * 100)}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="w-2 h-2 bg-[#1e2338] border-r border-b border-[#2a2d4a] transform rotate-45 absolute left-1/2 -bottom-1 -ml-1"></div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                {/* Add performance score label under the bar for Today and Yesterday */}
                                                {(isHighlighted || isYesterday) && (
                                                    <div
                                                        className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs font-medium 
                                                    ${isHighlighted ? "text-[#8a5cf6] dark:text-[#c4b5fd]" : "text-slate-500 dark:text-slate-400"}`}
                                                    >
                                                        {isHighlighted ? calculateTodayPerformanceScore() : calculateYesterdayPerformanceScore()}%
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* X-axis labels */}
                                <div className="ml-8 flex justify-between mt-8 max-w-[90%] mx-auto">
                                    {dailyStats.map((day, index) => (
                                        <div key={index} className="flex-1 text-center">
                                            <span
                                                className={`text-xs font-medium ${day.day === "Today"
                                                    ? "text-[#8a5cf6] dark:text-[#c4b5fd] font-bold"
                                                    : day.day === "Yesterday"
                                                        ? "text-slate-600 dark:text-slate-300"
                                                        : "text-slate-500 dark:text-slate-400"
                                                    }`}
                                            >
                                                {day.day}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-4 mt-8 justify-center bg-slate-50 dark:bg-[#1e2338]/50 py-2 rounded-lg">
                            {["Social Media", "AI Tools", "Search Engines", "Communication", "News & Media", "Others"].map(
                                (category) => (
                                    <div key={category} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getCategoryColor(category)}`}></div>
                                        <span className="text-xs text-slate-600 dark:text-slate-400">{category}</span>
                                    </div>
                                ),
                            )}
                        </div>

                        {/* Today's Insights with comparison to yesterday */}
                        <div className="mt-6 bg-gradient-to-br from-[#2a2d4a]/80 to-[#1e2338] rounded-xl overflow-hidden shadow-md">
                            <div className="px-5 py-3 border-b border-[#3a3f5a]">
                                <h4 className="text-sm font-semibold text-[#c4b5fd] flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Today's Insights
                                </h4>
                            </div>

                            <div className="p-4">
                                {/* Display today's stats */}
                                {getTodayData().totalVisits > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Performance Score Card */}
                                        <div className="bg-[#1e2338]/50 rounded-lg p-3 border border-[#3a3f5a]/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5 text-[#8a5cf6]" /> Performance Score
                                                </span>
                                                <span className="text-sm font-bold text-[#c4b5fd]">{calculateTodayPerformanceScore()}%</span>
                                            </div>

                                            {getYesterdayData().totalVisits > 0 && (
                                                <div
                                                    className={`text-xs flex items-center gap-1 ${getScoreChangeFromYesterday() > 0 ? "text-green-400" : getScoreChangeFromYesterday() < 0 ? "text-red-400" : "text-slate-400"}`}
                                                >
                                                    {getScoreChangeFromYesterday() > 0 ? (
                                                        <>
                                                            <ArrowUpRight className="w-3 h-3" />
                                                            <span>{Math.abs(getScoreChangeFromYesterday())}% better than yesterday</span>
                                                        </>
                                                    ) : getScoreChangeFromYesterday() < 0 ? (
                                                        <>
                                                            <ArrowDownRight className="w-3 h-3" />
                                                            <span>{Math.abs(getScoreChangeFromYesterday())}% worse than yesterday</span>
                                                        </>
                                                    ) : (
                                                        <span>Same as yesterday</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Social Media Card */}
                                        {getTodayData().categories["Social Media"] !== undefined && (
                                            <div className="bg-[#1e2338]/50 rounded-lg p-3 border border-[#3a3f5a]/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                                                        <div className="w-3.5 h-3.5 rounded-full bg-pink-500"></div> Social Media
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-200">
                                                        {getTodayData().categories["Social Media"]} visits
                                                    </span>
                                                </div>

                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400">
                                                        {Math.round((getTodayData().categories["Social Media"] / getTodayData().totalVisits) * 100)}%
                                                        of total
                                                    </span>

                                                    {getYesterdayData().categories["Social Media"] !== undefined && (
                                                        <span
                                                            className={`text-xs ${getTodayData().categories["Social Media"] < getYesterdayData().categories["Social Media"] ? "text-green-400" : getTodayData().categories["Social Media"] > getYesterdayData().categories["Social Media"] ? "text-red-400" : "text-slate-400"}`}
                                                        >
                                                            {getTodayData().categories["Social Media"] <
                                                                getYesterdayData().categories["Social Media"] ? (
                                                                <>
                                                                    {getYesterdayData().categories["Social Media"] -
                                                                        getTodayData().categories["Social Media"]}{" "}
                                                                    fewer
                                                                </>
                                                            ) : getTodayData().categories["Social Media"] >
                                                                getYesterdayData().categories["Social Media"] ? (
                                                                <>
                                                                    {getTodayData().categories["Social Media"] -
                                                                        getYesterdayData().categories["Social Media"]}{" "}
                                                                    more
                                                                </>
                                                            ) : (
                                                                <>Same as yesterday</>
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Most Visited Category Card */}
                                        {Object.entries(getTodayData().categories).length > 0 && (
                                            <div className="bg-[#1e2338]/50 rounded-lg p-3 border border-[#3a3f5a]/50">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                                                        <TrendingUp className="w-3.5 h-3.5 text-[#8a5cf6]" /> Most Visited
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-200">
                                                        {Object.entries(getTodayData().categories).sort(([, a], [, b]) => b - a)[0][0]}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {Object.entries(getTodayData().categories).sort(([, a], [, b]) => b - a)[0][1]} visits today
                                                </div>
                                            </div>
                                        )}

                                        {/* Total Visits Card */}
                                        <div className="bg-[#1e2338]/50 rounded-lg p-3 border border-[#3a3f5a]/50">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                                                    <Activity className="w-3.5 h-3.5 text-[#8a5cf6]" /> Total Visits
                                                </span>
                                                <span className="text-sm font-bold text-slate-200">{getTodayData().totalVisits}</span>
                                            </div>

                                            {getYesterdayData().totalVisits > 0 && (
                                                <div className="text-xs text-slate-400">
                                                    {getTodayData().totalVisits > getYesterdayData().totalVisits ? (
                                                        <span className="text-green-400">
                                                            {getTodayData().totalVisits - getYesterdayData().totalVisits} more than yesterday
                                                        </span>
                                                    ) : getTodayData().totalVisits < getYesterdayData().totalVisits ? (
                                                        <span className="text-amber-400">
                                                            {getYesterdayData().totalVisits - getTodayData().totalVisits} fewer than yesterday
                                                        </span>
                                                    ) : (
                                                        <span>Same as yesterday</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center py-6 text-slate-400">
                                        <p className="text-sm">No browsing activity recorded today.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default PerformanceMetrics
