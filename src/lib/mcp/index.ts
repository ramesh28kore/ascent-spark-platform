import { auth, defineMcp } from "@lovable.dev/mcp-js";

import whoamiTool from "./tools/whoami";
import listModulesTool from "./tools/list-modules";
import listStudentsTool from "./tools/list-students";
import listAssessmentsTool from "./tools/list-assessments";
import getScoresTool from "./tools/get-scores";
import createAssessmentTool from "./tools/create-assessment";
import recordScoreTool from "./tools/record-score";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "crt-training-console",
  title: "CRT Training Console",
  version: "0.1.0",
  instructions:
    "Tools for the Campus Recruitment Training console. Read the syllabus modules, student roster, assessments and scores, and (for trainers/admins) schedule assessments and record marks. All data access runs as the signed-in user under row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listModulesTool,
    listStudentsTool,
    listAssessmentsTool,
    getScoresTool,
    createAssessmentTool,
    recordScoreTool,
  ],
});
