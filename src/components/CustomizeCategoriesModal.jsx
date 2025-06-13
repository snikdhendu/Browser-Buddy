"use client"

import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"

const CustomizeCategoriesModal = ({ categories, setCategories, onClose }) => {
    const [newCategory, setNewCategory] = useState("")
    const [newDomains, setNewDomains] = useState({})

    const normalizeDomain = (url) => {
        try {
            const parsed = new URL(url.includes("://") ? url : `https://${url}`);
            return parsed.hostname.replace(/^www\./, "");
        } catch {
            return url.trim().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
        }
    }


    const handleAddCategory = () => {
        const trimmed = newCategory.trim()
        if (trimmed && !categories[trimmed]) {
            setCategories((prev) => ({ ...prev, [trimmed]: [] }))
            setNewCategory("")
        }
    }

    const handleAddDomain = (category, domain) => {
        setCategories((prev) => {
            const updated = { ...prev }
            updated[category] = [...(updated[category] || []), domain]
            return updated
        })
    }

    const handleRemoveDomain = (category, domainToRemove) => {
        setCategories((prev) => {
            const updated = { ...prev }
            updated[category] = updated[category].filter((domain) => domain !== domainToRemove)
            return updated
        })
    }

    const handleDeleteCategory = (categoryToDelete) => {
        setCategories((prev) => {
            const updated = { ...prev }
            delete updated[categoryToDelete]
            return updated
        })
    }

    const handleInputChange = (category, value) => {
        setNewDomains((prev) => ({
            ...prev,
            [category]: value,
        }))
    }

    const handleKeyDown = (e, category) => {
        if (e.key === "Enter" && newDomains[category]?.trim()) {
            handleAddDomain(category, normalizeDomain(newDomains[category].trim()))
            setNewDomains((prev) => ({
                ...prev,
                [category]: "",
            }))
        }
    }


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

    const isDefaultCategory = (category) => {
        return ["Social Media", "AI Tools", "Search Engines", "Communication", "News & Media"].includes(category)
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-1.5 rounded-md">
                            <Plus className="w-5 h-5" />
                        </span>
                        Customize Categories
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Add New Category</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="Enter category name"
                            className="flex-1 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                        />
                        <button
                            onClick={handleAddCategory}
                            disabled={!newCategory.trim()}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${newCategory.trim()
                                ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-sm hover:shadow"
                                : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                }`}
                        >
                            <Plus className="w-4 h-4" /> Add
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {Object.entries(categories).reverse().map(([category, domains]) => (
                        <div
                            key={category}
                            className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 text-lg">
                                        {getCategoryIcon(category)}
                                    </div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white">{category}</h3>
                                    <span className="text-xs px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                                        {domains.length} domains
                                    </span>
                                </div>
                                {!isDefaultCategory(category) && (
                                    <button
                                        onClick={() => handleDeleteCategory(category)}
                                        className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 text-sm flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                )}
                            </div>

                            <div className="mb-3">
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Add domain (e.g. example.com)"
                                        value={newDomains[category] || ""}
                                        onChange={(e) => handleInputChange(category, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, category)}
                                        className="flex-1 border border-slate-300 dark:border-slate-600 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-slate-700 dark:text-white"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newDomains[category]?.trim()) {
                                                handleAddDomain(category, normalizeDomain(newDomains[category].trim()))
                                                handleInputChange(category, "")
                                            }
                                        }}

                                        disabled={!newDomains[category]?.trim()}
                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${newDomains[category]?.trim()
                                            ? "bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                                            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                            }`}
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Press Enter to quickly add domains to this category
                                </p>
                            </div>

                            {domains.length > 0 ? (
                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                    <ul className="divide-y divide-slate-200 dark:divide-slate-700 max-h-48 overflow-y-auto">
                                        {domains.map((domain, idx) => (
                                            <li
                                                key={idx}
                                                className="flex justify-between items-center py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 group"
                                            >
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{domain}</span>
                                                <button
                                                    onClick={() => handleRemoveDomain(category, domain)}
                                                    className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg">
                                    No domains added to this category yet
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    )
}

export default CustomizeCategoriesModal
