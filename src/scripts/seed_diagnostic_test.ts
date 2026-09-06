// Seed script to add Class 1 Diagnostic Test questions
// Run with: npx ts-node src/scripts/seed_diagnostic_test.ts
import { supabase } from '@/integrations/supabase/client';

interface QuestionData {
  subject: string;
  topic: string;
  text: string;
  options: string[]; // 4 options
  answerIndex: number; // 0-based index of correct option
}

const CLASS_LEVEL = 1;
const DIAGNOSTIC_TOPIC = 'Diagnostic';
const DIFFICULTY = 'EASY';

const questions: QuestionData[] = [
  // Mathematics
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'What comes after 7?', options: ['9', '6', '8', '5'], answerIndex: 2 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'Which number is the smallest?', options: ['4', '9', '7', '6'], answerIndex: 0 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'How many fingers are there on one hand?', options: ['4', '6', '10', '5'], answerIndex: 3 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'What is 3 + 2?', options: ['6', '5', '4', '7'], answerIndex: 1 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'What is 8 − 3?', options: ['5', '6', '4', '3'], answerIndex: 0 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'Which number comes between 5 and 7?', options: ['4', '8', '6', '9'], answerIndex: 2 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'Which shape has three sides?', options: ['Circle', 'Square', 'Rectangle', 'Triangle'], answerIndex: 3 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'Riya has 4 apples. Her mother gives her 2 more. How many apples does Riya have now?', options: ['5', '7', '6', '4'], answerIndex: 2 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'Which number is greater?', options: ['9', '3', '5', '7'], answerIndex: 0 },
  { subject: 'Mathematics', topic: DIAGNOSTIC_TOPIC, text: 'How many sides does a square have?', options: ['3', '5', '6', '4'], answerIndex: 3 },
  // English
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Which letter comes after B?', options: ['D', 'C', 'A', 'E'], answerIndex: 1 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Choose the word that begins with C.', options: ['Ball', 'Dog', 'Cat', 'Fish'], answerIndex: 2 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Which word is a name of a person?', options: ['Rahul', 'Table', 'Apple', 'School'], answerIndex: 0 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Choose the correct word: I ___ a student.', options: ['are', 'am', 'is', 'be'], answerIndex: 1 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Which is the opposite of big?', options: ['Tall', 'Long', 'Small', 'Fat'], answerIndex: 2 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Which word rhymes with cat?', options: ['Dog', 'Sun', 'Pen', 'Bat'], answerIndex: 3 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Identify the vowel.', options: ['B', 'E', 'T', 'M'], answerIndex: 1 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Choose the correct sentence.', options: ['My name is Ravi.', 'my name ravi.', 'My name Ravi is.', 'Name my is Ravi.'], answerIndex: 0 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'What is the plural of book?', options: ['Bookes', 'Book', 'Books', 'Bookies'], answerIndex: 2 },
  { subject: 'English', topic: DIAGNOSTIC_TOPIC, text: 'Complete the sentence: The sun is ___.', options: ['cold', 'hot', 'wet', 'dark'], answerIndex: 1 },
  // EVS
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which part of the body helps us to see?', options: ['Eyes', 'Ears', 'Nose', 'Hands'], answerIndex: 0 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which animal gives us milk?', options: ['Lion', 'Tiger', 'Cow', 'Horse'], answerIndex: 2 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which of these is a fruit?', options: ['Carrot', 'Potato', 'Spinach', 'Mango'], answerIndex: 3 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which sense organ helps us to hear?', options: ['Nose', 'Ears', 'Eyes', 'Tongue'], answerIndex: 1 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Where do fish live?', options: ['Water', 'Trees', 'Desert', 'Nest'], answerIndex: 0 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which one is a domestic animal?', options: ['Lion', 'Tiger', 'Dog', 'Elephant'], answerIndex: 2 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'What do plants need to grow?', options: ['Toys', 'Sunlight and water', 'Shoes', 'Books'], answerIndex: 1 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which vehicle travels on the road?', options: ['Aeroplane', 'Ship', 'Boat', 'Bus'], answerIndex: 3 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which of these is used to keep our teeth clean?', options: ['Toothbrush', 'Spoon', 'Plate', 'Pencil'], answerIndex: 0 },
  { subject: 'EVS', topic: DIAGNOSTIC_TOPIC, text: 'Which season is usually very hot in India?', options: ['Winter', 'Summer', 'Rainy', 'Spring'], answerIndex: 1 },
];

async function ensureSubject(subjectName: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', subjectName)
    .eq('class_level', CLASS_LEVEL)
    .single();
  if (existing) return existing.id as string;
  const { data, error } = await supabase
    .from('subjects')
    .insert({ class_level: CLASS_LEVEL, name: subjectName, status: 'ACTIVE' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function ensureTopic(subjectId: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('topics')
    .select('id')
    .eq('subject_id', subjectId)
    .eq('name', DIAGNOSTIC_TOPIC)
    .single();
  if (existing) return existing.id as string;
  const { data, error } = await supabase
    .from('topics')
    .insert({ subject_id: subjectId, name: DIAGNOSTIC_TOPIC, status: 'ACTIVE' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function insertQuestion(subjectId: string, topicId: string, q: QuestionData) {
  const { data: newQ, error: qErr } = await supabase
    .from('questions')
    .insert({
      class_level: CLASS_LEVEL,
      subject_id: subjectId,
      topic_id: topicId,
      question_text: q.text,
      question_type: 'MCQ',
      difficulty: DIFFICULTY,
      marks: 1,
      status: 'ACTIVE',
      created_by: (await supabase.auth.getUser()).data.user?.id || '',
    })
    .select('id')
    .single();
  if (qErr) throw qErr;
  const options = q.options.map((opt, idx) => ({
    question_id: newQ.id,
    option_text: opt,
    option_order: idx + 1,
    is_correct: idx === q.answerIndex,
  }));
  const { error: optErr } = await supabase.from('question_options').insert(options);
  if (optErr) throw optErr;
}

async function main() {
  const subjectCache: Record<string, { id: string; topicId: string }> = {};
  for (const q of questions) {
    if (!subjectCache[q.subject]) {
      const subjectId = await ensureSubject(q.subject);
      const topicId = await ensureTopic(subjectId);
      subjectCache[q.subject] = { id: subjectId, topicId };
    }
    const cacheEntry = subjectCache[q.subject];
    if (cacheEntry) {
      await insertQuestion(cacheEntry.id, cacheEntry.topicId, q);
      console.log(`Inserted: ${q.subject} - ${q.text}`);
    }
  }
  console.log('All diagnostic questions inserted.');
}

main().catch((e) => {
  console.error('Error inserting diagnostic test:', e);
  process.exit(1);
});
