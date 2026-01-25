import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { THEMES } from "@/themes/themeConfig";

export default function GlobalSettingsManager() {
  const [currentTheme, setCurrentTheme] = useState("default");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTheme = async () => {
      const { data, error } = await supabase
        .from("global_settings")
        .select("value")
        .eq("key", "app_theme")
        .maybeSingle();
      
      if (data) setCurrentTheme(data.value);
      setLoading(false);
    };
    fetchTheme();
  }, []);

  const handleThemeChange = async (newTheme) => {
    if (newTheme === currentTheme || saving) return;
    
    setSaving(true);
    const { error } = await supabase
      .from("global_settings")
      .update({ 
        value: newTheme, 
        updated_at: new Date().toISOString() 
      })
      .eq("key", "app_theme");
    
    if (!error) {
      setCurrentTheme(newTheme);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">🎨 App Theme</h2>
      <p className="text-gray-600 mb-4">
        Select the visual theme for all players. Changes apply immediately to everyone.
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-md">
        {Object.entries(THEMES).map(([key, themeData]) => (
          <button
            key={key}
            onClick={() => handleThemeChange(key)}
            disabled={saving}
            className={`p-4 rounded-xl border-2 transition-all ${
              currentTheme === key
                ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-3xl mb-2">{themeData.icon}</div>
            <div className="text-sm font-medium">{themeData.name}</div>
          </button>
        ))}
      </div>
      {saving && <p className="text-blue-500 mt-2 text-sm">Saving...</p>}
    </div>
  );
}
