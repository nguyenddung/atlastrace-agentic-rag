import { ResearchStudio } from "@/components/research-studio";
import { runDeterministicResearch } from "@/lib/rag/deterministic";

const initialQuestion = "Should Northstar roll out predictive maintenance across its EU fleet?";

export default function Home() {
  return <ResearchStudio initialResult={runDeterministicResearch(initialQuestion)} />;
}

