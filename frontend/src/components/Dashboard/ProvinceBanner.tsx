export default function ProvinceBanner() {
  return (
    <div className="rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white overflow-hidden relative">
      <div className="relative z-10 max-w-2xl">
        <h2 className="text-2xl font-bold">Southern Province</h2>
        <p className="mt-2 text-blue-100">
          Governance & Digital Excellence
        </p>
      </div>
      <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10">
        <svg className="h-64 w-64" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
        </svg>
      </div>
    </div>
  );
}