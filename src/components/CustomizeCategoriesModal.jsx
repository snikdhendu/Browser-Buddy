import React, { useState } from "react";

const CustomizeCategoriesModal = ({ categories, setCategories, onClose }) => {
    const [newCategory, setNewCategory] = useState("");

    const handleAddCategory = () => {
        const trimmed = newCategory.trim();
        if (trimmed && !categories[trimmed]) {
            setCategories(prev => ({ ...prev, [trimmed]: [] }));
            setNewCategory("");
        }
    };

    const handleAddDomain = (category, domain) => {
        setCategories(prev => {
            const updated = { ...prev };
            updated[category] = [...(updated[category] || []), domain];
            return updated;
        });
    };

    const handleRemoveDomain = (category, domainToRemove) => {
        setCategories(prev => {
            const updated = { ...prev };
            updated[category] = updated[category].filter(domain => domain !== domainToRemove);
            return updated;
        });
    };

    const handleDeleteCategory = (categoryToDelete) => {
        setCategories(prev => {
            const updated = { ...prev };
            delete updated[categoryToDelete];
            return updated;
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold">Customize Categories</h2>
                    <button onClick={onClose} className="text-gray-600 hover:text-red-500">✖</button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="Add new category"
                        className="border px-2 py-1 rounded text-sm w-2/3 mr-2"
                    />
                    <button
                        onClick={handleAddCategory}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                    >
                        Add Category
                    </button>
                </div>

                {Object.entries(categories).map(([cat, domains]) => (
                    <div key={cat} className="mb-6 border-b pb-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-semibold">{cat}</h3>
                            {["Social Media", "AI Tools", "Search Engines", "Communication", "News & Media"].includes(cat) ? null : (
                                <button
                                    onClick={() => handleDeleteCategory(cat)}
                                    className="text-red-500 text-sm hover:underline"
                                >
                                    Delete Category
                                </button>
                            )}
                        </div>

                        <ul className="space-y-1 mb-2 mt-1">
                            {domains.map((domain, idx) => (
                                <li key={idx} className="flex justify-between items-center text-sm">
                                    <span>{domain}</span>
                                    <button
                                        onClick={() => handleRemoveDomain(cat, domain)}
                                        className="text-red-400 hover:underline text-xs"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <input
                            type="text"
                            placeholder="Add domain (e.g. example.com)"
                            className="border px-2 py-1 rounded text-sm w-full"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && e.target.value.trim() !== "") {
                                    handleAddDomain(cat, e.target.value.trim());
                                    e.target.value = "";
                                }
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CustomizeCategoriesModal;
