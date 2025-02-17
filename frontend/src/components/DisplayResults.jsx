export default function DisplayResults({ results }) {
  return (
    <div className="mt-4 w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 gap-4">
      {results.map((paper, index) => {
        // Convert the date to a readable format
        let formattedDate = "Unknown";
        if (paper.datePublished && paper.datePublished !== "Unknown") {
          const dateObject = new Date(paper.datePublished);
          if (!isNaN(dateObject)) {
            formattedDate = dateObject.toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
          }
        }

        return (
          <div key={index} className="p-4 border rounded-md shadow bg-white">
            <h3 className="font-semibold text-lg">{paper.title}</h3>
            <p className="text-sm italic text-gray-600">
              Published: {formattedDate}
            </p>
            <p className="text-gray-700">
              {paper.abstract.length > 200
                ? `${paper.abstract.substring(0, 200)}...`
                : paper.abstract}
            </p>
            <a
              href={paper.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline mt-2 inline-block"
            >
              Read More →
            </a>
          </div>
        );
      })}
    </div>
  );
}
