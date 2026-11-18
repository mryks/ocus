const origin = import.meta.env.VITE_REPORTS_ORIGIN as string | undefined
export const apiUrl = (path: string) => origin ? new URL(path, origin).href : path
export const publicAsset = (path: string) => path.startsWith('/') ? `${import.meta.env.BASE_URL}${path.slice(1)}` : path
