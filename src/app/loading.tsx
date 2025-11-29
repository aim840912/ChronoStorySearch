export default function Loading() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
			<div className="container mx-auto px-4 py-12">
				{/* 載入動畫 */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
					{[1, 2, 3, 4, 5, 6].map((i) => (
						<div
							key={i}
							className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 animate-pulse"
						>
							<div className="flex justify-between items-start mb-4">
								<div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
								<div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
							</div>
							<div className="space-y-3">
								<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
								<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
								<div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
							</div>
						</div>
					))}
				</div>

				{/* 載入文字 */}
				<div className="mt-12 text-center">
					<div className="inline-flex items-center gap-2">
						<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
						<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
						<div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
						<span className="ml-2 text-gray-600 dark:text-gray-400">
							載入中
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
