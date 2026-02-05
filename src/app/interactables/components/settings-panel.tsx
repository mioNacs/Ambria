"use client";

import { withInteractable } from "@tambo-ai/react";
import { useMemo, useState } from "react";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
    sms: z.boolean(),
  }),
  theme: z.enum(["light", "dark", "system"]),
  language: z.enum(["en", "es", "fr", "de"]),
  privacy: z.object({
    shareAnalytics: z.boolean(),
    personalizationEnabled: z.boolean(),
  }),
});

type SettingsProps = z.infer<typeof settingsSchema>;

function SettingsPanelForm({
  initialSettings,
}: {
  initialSettings: SettingsProps;
}) {
  const [settings, setSettings] = useState<SettingsProps>(initialSettings);
  const [emailError, setEmailError] = useState<string>("");

  const handleChange = (updates: Partial<SettingsProps>) => {
    setSettings((prev) => ({ ...prev, ...updates }));

    if ("email" in updates) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email as string)) {
        setEmailError("Please enter a valid email address");
      } else {
        setEmailError("");
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h2>

      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Personal Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => handleChange({ name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => handleChange({ email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  emailError ? "border-red-500" : "border-gray-300"
                }`}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-600">{emailError}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.email}
                onChange={(e) =>
                  handleChange({
                    notifications: {
                      ...settings.notifications,
                      email: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Email notifications
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.push}
                onChange={(e) =>
                  handleChange({
                    notifications: {
                      ...settings.notifications,
                      push: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Push notifications
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.notifications.sms}
                onChange={(e) =>
                  handleChange({
                    notifications: {
                      ...settings.notifications,
                      sms: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                SMS notifications
              </span>
            </label>
          </div>
        </div>

        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  handleChange({
                    theme: e.target.value as "light" | "dark" | "system",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) =>
                  handleChange({
                    language: e.target.value as "en" | "es" | "fr" | "de",
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.privacy.shareAnalytics}
                onChange={(e) =>
                  handleChange({
                    privacy: {
                      ...settings.privacy,
                      shareAnalytics: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Share usage analytics
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.privacy.personalizationEnabled}
                onChange={(e) =>
                  handleChange({
                    privacy: {
                      ...settings.privacy,
                      personalizationEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enable personalization
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Current Settings (JSON)
        </h4>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify(settings, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function SettingsPanelBase(props: SettingsProps) {
  const propsKey = useMemo(
    () =>
      [
        props.name,
        props.email,
        props.notifications.email,
        props.notifications.push,
        props.notifications.sms,
        props.theme,
        props.language,
        props.privacy.shareAnalytics,
        props.privacy.personalizationEnabled,
      ].join("|"),
    [
      props.email,
      props.language,
      props.name,
      props.notifications.email,
      props.notifications.push,
      props.notifications.sms,
      props.privacy.personalizationEnabled,
      props.privacy.shareAnalytics,
      props.theme,
    ],
  );
  return <SettingsPanelForm key={propsKey} initialSettings={props} />;
}

const InteractableSettingsPanel = withInteractable(SettingsPanelBase, {
  componentName: "SettingsForm",
  description:
    "User settings form with personal info, notifications, and preferences",
  propsSchema: settingsSchema,
});

export function SettingsPanel() {
  return (
    <InteractableSettingsPanel
      name="Alice Johnson"
      email="alice@example.com"
      notifications={{
        email: true,
        push: false,
        sms: true,
      }}
      theme="light"
      language="en"
      privacy={{
        shareAnalytics: false,
        personalizationEnabled: true,
      }}
      onPropsUpdate={(newProps) => {
        console.log("Settings updated from Tambo:", newProps);
      }}
    />
  );
}
