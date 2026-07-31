import { buildReport, type ReportData } from "@/lib/report-builders";
import { reportToPdfDoc, reportToWorkbook, reportToCsvText } from "@/lib/export-formats";
import * as XLSX from "xlsx";
import { writeFileSync } from "fs";

const modules = ["M1","M2","M3","M4","M5","M6","M7"].map((c,i)=>({id:`m${i}`,code:c,title:`Module ${c} training block`,weight_percent:10+i,hours:20,sort_order:i}));
const batches = [{id:"b1",name:"CRT-2026-A",academic_year:"2026",branch:"CSE",active:true},{id:"b2",name:"CRT-2026-B",academic_year:"2026",branch:"ECE",active:true}];
const students = Array.from({length:24},(_,i)=>({id:`s${i}`,full_name:`Student Number ${i+1}`,roll_number:`21CS${100+i}`,branch:i%2?"CSE":"ECE",year:"IV",batch:"CRT-2026-A",batch_id:i%2?"b1":"b2",email:`s${i}@x.edu`}));
const assessments = modules.flatMap((m,i)=>[{id:`a${i}`,title:`Weekly test ${i+1}`,kind:"weekly_test",module_id:m.id,max_marks:50,scheduled_on:`2026-0${(i%9)+1}-10`}]);
const scores = students.flatMap(s=>assessments.map((a,i)=>({id:`${s.id}-${a.id}`,student_id:s.id,assessment_id:a.id,marks:15+((i*7+Number(s.id.slice(1)))%35),attempts:1,recorded_at:`2026-0${(i%9)+1}-12T10:00:00Z`})));
const questions = modules.flatMap((m,i)=>Array.from({length:3},(_,j)=>({id:`q${i}${j}`,module_id:m.id,level:"easy"})));
const submissions = students.flatMap(s=>questions.map((q,i)=>({id:`${s.id}${q.id}`,question_id:q.id,student_id:s.id,ai_score:(i*3+Number(s.id.slice(1)))%11,max_score:10,verdict:"AC",created_at:"2026-05-02T10:00:00Z"})));
const sessions = modules.map((m,i)=>({id:`ss${i}`,batch_id:"b1",module_id:m.id,scheduled_at:"2026-04-01"}));
const attendance = students.flatMap(s=>sessions.map(ss=>({id:`${s.id}${ss.id}`,session_id:ss.id,student_id:s.id,present:Math.random()>0.25,marked_at:"2026-04-01T09:00:00Z"})));
const practiceProblems = modules.flatMap((m,i)=>Array.from({length:4},(_,j)=>({id:`p${i}${j}`,points:10,module_id:m.id})));
const practiceProgress = students.flatMap(s=>practiceProblems.slice(0,Number(s.id.slice(1))%20).map(p=>({student_id:s.id,problem_id:p.id,status:"solved",updated_at:"2026-05-01"})));
const mocks = students.map(s=>({student_id:s.id,rating:40+(Number(s.id.slice(1))*3)%55,held_on:"2026-05-05"}));
const attempts = students.flatMap(s=>[{id:`t${s.id}`,test_id:"t1",student_id:s.id,score:30+(Number(s.id.slice(1))*2)%60,max_score:100,submitted_at:"2026-05-06T10:00:00Z",started_at:"2026-05-06T09:00:00Z",blur_count:0}]);
const tests=[{id:"t1",title:"Mock NQT",module_id:"m0",batch_id:"b1",exam_kind:"mcq_quiz",starts_at:"2026-05-06"}];

const data = {students,batches,modules,assessments,scores,attempts,tests,submissions,questions,attendance,sessions,practiceProblems,practiceProgress,mocks} as unknown as ReportData;
const filters = {batchId:"all",moduleId:"all",from:"",to:""};

for (const kind of ["student","batch","module"] as const) {
  const doc = buildReport(kind, data, filters);
  const pdf = reportToPdfDoc(doc);
  writeFileSync(`/tmp/qa/${kind}.pdf`, Buffer.from(pdf.output("arraybuffer")));
  XLSX.writeFile(reportToWorkbook(doc), `/tmp/qa/${kind}.xlsx`);
  writeFileSync(`/tmp/qa/${kind}.csv`, reportToCsvText(doc));
  console.log(kind, "sections:", doc.sections.map(s=>`${s.name}(${s.rows.length})`).join(", "), "| summary:", doc.summary.map(x=>`${x.label}=${x.value}`).join(" "));
}
