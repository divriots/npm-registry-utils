export type Version = any

export type Meta = {
    error?: string;
    modified: string
    versions: Record<string, Version>;
    'dist-tags': Record<string, string>;
}