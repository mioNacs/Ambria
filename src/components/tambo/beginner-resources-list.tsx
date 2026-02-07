"use client";

import { z } from "zod";
import { ExternalLink, BookOpen, Users, Star, Github } from "lucide-react";
import { cn } from "@/lib/utils";

// Schema for a single resource
const resourceSchema = z.object({
    name: z.string(),
    description: z.string(),
    url: z.string(),
    category: z.enum(["repo", "doc", "community"]),
    tags: z.array(z.string()).optional(),
});

// Schema for the component props
export const beginnerResourcesListSchema = z.object({
    resources: z.array(resourceSchema).describe("List of beginner-friendly resources to display"),
});

export type BeginnerResource = z.infer<typeof resourceSchema>;
export type BeginnerResourcesListProps = z.infer<typeof beginnerResourcesListSchema>;

export function BeginnerResourcesList({ resources }: BeginnerResourcesListProps) {
    if (!resources || resources.length === 0) {
        return null;
    }

    const getIcon = (category: string) => {
        switch (category) {
            case "repo":
                return <Github className="w-5 h-5 text-gray-700" />;
            case "doc":
                return <BookOpen className="w-5 h-5 text-blue-600" />;
            case "community":
                return <Users className="w-5 h-5 text-green-600" />;
            default:
                return <Star className="w-5 h-5 text-yellow-500" />;
        }
    };

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "repo": return "Repository";
            case "doc": return "Documentation";
            case "community": return "Community";
            default: return "Resource";
        }
    };

    return (
        <div className="space-y-4 my-4">
            <h3 className="text-lg font-semibold text-gray-900 px-1">Beginner-Friendly Open Source Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resources.map((resource, index) => (
                    <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-4 bg-white border border-gray-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn(
                                    "p-2 rounded-lg bg-gray-50 group-hover:bg-emerald-50 transition-colors",
                                )}>
                                    {getIcon(resource.category)}
                                </div>
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {getCategoryLabel(resource.category)}
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors opacity-0 group-hover:opacity-100" />
                        </div>

                        <h4 className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors mb-1">
                            {resource.name}
                        </h4>

                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {resource.description}
                        </p>

                        {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {resource.tags.map(tag => (
                                    <span key={tag} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </a>
                ))}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">How to find &quot;Good First Issues&quot;</h4>
                <p className="text-sm text-blue-700 mb-2">
                    Search on GitHub using these filters:
                </p>
                <code className="block bg-white/50 px-2 py-1.5 rounded text-xs text-blue-900 font-mono mb-2 border border-blue-100">
                    label:"good first issue" language:TypeScript is:issue is:open
                </code>
                <div className="flex gap-4 text-xs">
                    <a href="https://goodfirstissue.dev" target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                        goodfirstissue.dev <ExternalLink className="w-3 h-3" />
                    </a>
                    <a href="https://up-for-grabs.net" target="_blank" className="text-blue-600 hover:underline flex items-center gap-1">
                        up-for-grabs.net <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}
