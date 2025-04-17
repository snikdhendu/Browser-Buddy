import { useEffect, useState } from "react";
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ScreenTime = () => {
    const [screenTimeData, setScreenTimeData] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [weeklyTotal, setWeeklyTotal] = useState("0 mins");
    const [isLoading, setIsLoading] = useState(true);

    // Days abbreviations for the header
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Fetch and process history data
    useEffect(() => {
        const fetchAndProcessHistory = async () => {
            setIsLoading(true);

            try {
                // Get history for the last 7 days
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const historyItems = await new Promise((resolve) => {
                    chrome.history.search(
                        {
                            text: '',
                            startTime: oneWeekAgo.getTime(),
                            endTime: Date.now(),
                            maxResults: 10000
                        },
                        resolve
                    );
                });

                const dateMap = new Map();

                // Process each history item
                historyItems.forEach(item => {
                    if (!item.url) return;

                    try {
                        const url = new URL(item.url);
                        const hostname = url.hostname.replace('www.', '');
                        const date = new Date(item.lastVisitTime);
                        const dayKey = `${daysOfWeek[date.getDay()]}, ${date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`;

                        // Estimate time spent (1 minute per visit as approximation)
                        const timeSpent = 1;

                        if (!dateMap.has(dayKey)) {
                            dateMap.set(dayKey, {
                                date: dayKey,
                                dayOfWeek: daysOfWeek[date.getDay()],
                                totalTime: 0,
                                apps: {},
                                rawDate: date
                            });
                        }

                        const dayData = dateMap.get(dayKey);
                        dayData.totalTime += timeSpent;

                        if (!dayData.apps[hostname]) {
                            dayData.apps[hostname] = 0;
                        }
                        dayData.apps[hostname] += timeSpent;
                    } catch (e) {
                        console.error('Error processing URL:', item.url, e);
                    }
                });

                // Convert to array and format
                const processedData = Array.from(dateMap.values())
                    .map(day => {
                        // Convert apps object to array and sort by time
                        const appsArray = Object.entries(day.apps)
                            .map(([name, time]) => ({ name, time }))
                            .sort((a, b) => b.time - a.time);

                        return {
                            ...day,
                            totalTime: formatTime(day.totalTime),
                            apps: appsArray.map(app => ({
                                name: app.name,
                                time: formatTime(app.time)
                            }))
                        };
                    })
                    .sort((a, b) => b.rawDate - a.rawDate);

                // Calculate weekly total
                const weeklyTotalMinutes = processedData
                    .reduce((sum, day) => sum + convertTimeToMinutes(day.totalTime), 0);

                setWeeklyTotal(formatTime(weeklyTotalMinutes));
                setScreenTimeData(processedData);

                // Set initially selected date to the most recent day with data
                if (processedData.length > 0) {
                    setSelectedDate(processedData[0]);
                }
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndProcessHistory();
    }, []);

    // Format minutes into "X hrs, Y mins" or "X mins"
    const formatTime = (minutes) => {
        const hrs = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);

        if (hrs > 0) {
            return `${hrs} hr${hrs !== 1 ? 's' : ''}, ${mins} min${mins !== 1 ? 's' : ''}`;
        }
        return `${mins} min${mins !== 1 ? 's' : ''}`;
    };

    // Convert formatted time back to minutes
    const convertTimeToMinutes = (timeStr) => {
        let minutes = 0;
        if (timeStr.includes('hr')) {
            const hrs = parseInt(timeStr.split('hr')[0].trim());
            minutes += hrs * 60;
            if (timeStr.includes('min')) {
                const mins = parseInt(timeStr.split('min')[0].split(',').pop().trim());
                minutes += mins;
            }
        } else if (timeStr.includes('min')) {
            minutes += parseInt(timeStr.split('min')[0].trim());
        }
        return minutes;
    };

    // Prepare data for the chart
    const chartData = selectedDate ? {
        labels: selectedDate.apps.slice(0, 3).map(app => app.name),
        datasets: [{
            data: selectedDate.apps.slice(0, 3).map(app => convertTimeToMinutes(app.time)),
            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
            borderWidth: 0
        }]
    } : null;

    // Create day items for the header, ensuring all 7 days are represented
    const headerDays = daysOfWeek.map(day => {
        const matchingDay = screenTimeData.find(d => d.dayOfWeek === day);
        return matchingDay || {
            date: `${day}, ${new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}`,
            dayOfWeek: day,
            totalTime: "0 mins",
            apps: [],
            rawDate: new Date()
        };
    });

    if (isLoading) {
        return <div className="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">Loading...</div>;
    }

    return (
        <div className="bg-white rounded-lg p-4 shadow-sm max-w-md mx-auto">
            <h2 className="text-lg font-semibold mb-4">Activity details</h2>

            <div className="mb-4 border-b pb-4">
                <h3 className="text-sm font-medium text-gray-600 mb-1">Screen time</h3>
                <div className="text-2xl font-bold">{weeklyTotal}</div>
                {selectedDate && (
                    <div className="text-sm text-gray-500">{selectedDate.date}</div>
                )}
            </div>

            <div className="flex justify-between mb-6">
                {headerDays.map((day, index) => (
                    <div
                        key={index}
                        className={`text-center text-xs cursor-pointer ${selectedDate?.dayOfWeek === day.dayOfWeek
                                ? 'text-blue-600 font-medium'
                                : 'text-gray-500'
                            }`}
                        onClick={() => setSelectedDate(day)}
                    >
                        {day.dayOfWeek}
                    </div>
                ))}
            </div>

            {selectedDate && (
                <div className="space-y-4">
                    <div className="text-sm font-medium text-gray-600">{selectedDate.date}</div>

                    <div className="space-y-3">
                        {selectedDate.apps.slice(0, 3).map((app, index) => (
                            <div key={index} className="flex justify-between items-center">
                                <span className="font-medium">{app.name}</span>
                                <span className="text-gray-600">{app.time}</span>
                            </div>
                        ))}
                    </div>

                    {chartData && (
                        <div className="h-40 mt-4">
                            <Doughnut
                                data={chartData}
                                options={{
                                    maintainAspectRatio: false,
                                    cutout: '70%',
                                    plugins: {
                                        legend: {
                                            display: false,
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: function (context) {
                                                    return `${context.label}: ${context.raw} mins`;
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ScreenTime;