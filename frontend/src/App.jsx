import { useState, useRef, useEffect } from "react";
import QueryInput from "./components/QueryInput";
import DisplayResults from "./components/DisplayResults";
import LoadingBar from "react-top-loading-bar";

// Default articles to display on initial load
const defaultArticles = [
  {
    title:
      "Cognitive AI framework: advances in the simulation of human thought",
    abstract:
      "The Human Cognitive Simulation Framework represents a significant advancement in integrating human cognitive capabilities into artificial intelligence systems. By merging short-term memory (conversation context), long-term memory (interaction context), advanced cognitive processing, and efficient knowledge management, it ensures contextual coherence and persistent data storage, enhancing personalization and continuity in human-AI interactions. The framework employs a unified database that synchronizes these contexts while incorporating logical, creative, and analog processing modules inspired by human brain hemispheric functions to perform structured tasks and complex inferences. Dynamic knowledge updates enable real-time integration, improving adaptability and fostering applications in education, behavior analysis, and knowledge management. Despite its potential to process vast data volumes and enhance user experience, challenges remain in scalability, cognitive bias mitigation, and ethical compliance. This framework lays the foundation for future research in continuous learning algorithms, sustainability, and multimodal adaptability, positioning Cognitive AI as a transformative model in emerging fields.",
    datePublished: "2025-02-06",
    link: "http://arxiv.org/abs/2502.04259v1",
  },
  {
    title:
      "Perspectives-Observer-Transparency -- A Novel Paradigm for Modelling the Human in Human-To-Anything Interaction Based on a Structured Review of the Human Digital Twin",
    abstract:
      "Modern modelling approaches fail when it comes to understanding rather than pure supervision of human behavior. As humans become more and more integrated into human-to-anything interactions, the understanding of the human as a whole becomes critical. In this paper, we conduct a structured review of the human digital twin to indicate where modern paradigms fail to model the human agent. Particularly, the mechanistic viewpoint limits the usability of human and general digital twins. Instead, we propose a novel way of thinking about models, states, and their relations: Perspectives-Observer-Transparency. The modelling paradigm indicates how transparency - or whiteness - relates to the abilities of an observer, which again allows to model the penetration depth of a system model into the human psyche. The split in between the human's outer and inner states is described with a perspectives model, featuring the introperspective and the exteroperspective. We explore this novel paradigm by employing two recent scenarios from ongoing research and give examples to emphasize specific characteristics of the modelling paradigm",
    datePublished: "2024-08-13",
    link: "https://arxiv.org/abs/2408.06785v1",
  },
  {
    title: "Training development for multisensory data analysis",
    abstract:
      "Perception is a process that requires a great deal of mental processing, which provides the means by which one's concept of the environment is created and which helps one learn and interact with it. The compilation of previous studies throughout history has led to the conclusion that auditory performance improves when combined with visual stimuli and vice versa. Taking into account the previous consideration, in the present work the two sensory pathways (vision and hearing) were used with the intention of carrying out a series of multisensory training, which were presented in different instances and with the purpose of introducing sound as a signal detection tool. A web development was also included to create a site that would allow the execution of the designed training, which is still in development due to difficulties that arose and exceed the limits of this final work. The work described in this report gave rise to a future doctoral thesis, which has a CONICET scholarship, where the development of new training and the continuous development of the website that will allow its execution are proposed.",
    datePublished: "2023-05-11",
    link: "https://arxiv.org/abs/2305.06943v1",
  },
  {
    title: "Calculating Cognitive Augmentation, A Case Study",
    abstract:
      "We are entering an era in which humans will increasingly work in partnership and collaboration with artificially intelligent entities. For millennia, tools have augmented human physical and mental performance but in the coming era of cognitive systems, human cognitive performance will be augmented. We are only just now beginning to define the fundamental concepts and metrics to describe, characterize, and measure augmented and collaborative cognition. In this paper, the results of a cognitive augmentation experiment are discussed and we calculate the increase in cognitive accuracy and cognitive precision. In the case study, cognitively augmented problem solvers show an increase of 74% in cognitive accuracy (the ability to synthesize desired answers) and a 27% increase in cognitive precision (the ability to synthesize only desired answers). We offer a formal treatment of the case study results and propose cognitive accuracy and cognitive precision as standard metrics to describe and measure human cognitive augmentation.",
    datePublished: "2022-11-11",
    link: "https://arxiv.org/abs/2211.06479v1",
  },
  {
    title:
      "Spaced Repetition and Mnemonics Enable Recall of Multiple Strong Passwords",
    abstract:
      "We report on a user study that provides evidence that spaced repetition and a specific mnemonic technique enable users to successfully recall multiple strong passwords over time. Remote research participants were asked to memorize 4 Person-Action-Object (PAO) stories where they chose a famous person from a drop-down list and were given machine-generated random action-object pairs. Users were also shown a photo of a scene and asked to imagine the PAO story taking place in the scene (e.g., Bill Gates---swallowing---bike on a beach). Subsequently, they were asked to recall the action-object pairs when prompted with the associated scene-person pairs following a spaced repetition schedule over a period of 127+ days. While we evaluated several spaced repetition schedules, the best results were obtained when users initially returned after 12 hours and then in 1.5× increasing intervals: 77% of the participants successfully recalled all 4 stories in 10 tests over a period of 158 days. Much of the forgetting happened in the first test period (12 hours): 89% of participants who remembered their stories during the first test period successfully remembered them in every subsequent round. These findings, coupled with recent results on naturally rehearsing password schemes, suggest that 4 PAO stories could be used to create usable and strong passwords for 14 sensitive accounts following this spaced repetition schedule, possibly with a few extra upfront rehearsals. In addition, we find that there is an interference effect across multiple PAO stories: the recall rate of 100% (resp. 90%) for participants who were asked to memorize 1 PAO story (resp. 2 PAO stories) is significantly better than the recall rate for participants who were asked to memorize 4 PAO stories. These findings yield concrete advice for improving constructions of password management schemes and future user studies.",
    datePublished: "2014-10-06",
    link: "https://arxiv.org/abs/1410.1490v3",
  },
  {
    title: "Reclaiming human machine nature",
    abstract:
      "Extending and modifying his domain of life by artifact production is one of the main characteristics of humankind. From the first hominid, who used a wood stick or a stone for extending his upper limbs and augmenting his gesture strength, to current systems engineers who used technologies for augmenting human cognition, perception and action, extending human body capabilities remains a big issue. From more than fifty years cybernetics, computer and cognitive sciences have imposed only one reductionist model of human machine systems: cognitive systems. Inspired by philosophy, behaviorist psychology and the information treatment metaphor, the cognitive system paradigm requires a function view and a functional analysis in human systems design process. According that design approach, human have been reduced to his metaphysical and functional properties in a new dualism. Human body requirements have been left to physical ergonomics or physiology. With multidisciplinary convergence, the issues of human-machine systems and human artifacts evolve. The loss of biological and social boundaries between human organisms and interactive and informational physical artifact questions the current engineering methods and ergonomic design of cognitive systems. New developpment of human machine systems for intensive care, human space activities or bio-engineering sytems requires grounding human systems design on a renewed epistemological framework for future human systems model and evidence based bio-engineering. In that context, reclaiming human factors, augmented human and human machine nature is a necessity",
    datePublished: "2014-09-29",
    link: "https://arxiv.org/abs/1409.8280v1",
  },
];

const suggestedQueries = [
  "AI in HCI",
  "User Experience Design",
  "Accessibility in Apps",
  "Future of Interaction Design",
  "HCI in Education",
  "Trends in Human-Computer Interaction",
];

export default function App() {
  const [results, setResults] = useState(defaultArticles);
  const loadingBarRef = useRef(null);

  async function handleSearch(query) {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        console.warn("Ignoring empty search query.");
        return;
      }

      console.log("Sending search request...");
      loadingBarRef.current.continuousStart();

      const response = await fetch("http://127.0.0.1:10000/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received Data:", data);
      setResults(data.results);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      loadingBarRef.current.complete();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center px-4">
      <LoadingBar ref={loadingBarRef} color="#60A5FA" height={10} />
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-center mt-10 mb-6 text-gray-800">
          HCI Paper Search
        </h1>
        <QueryInput onSearch={handleSearch} />
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Suggested Searches:</h2>
          <div className="flex gap-2 flex-wrap">
            {suggestedQueries.map((query, index) => (
              <button
                key={index}
                className="px-3 py-1 bg-blue-200 text-blue-700 rounded-md hover:bg-blue-300"
                onClick={() => handleSearch(query)}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
        <DisplayResults results={results} />
      </div>
    </div>
  );
}
