import { queueAnalyze } from '../src/lib/queue/queues';

const JOB_ID = '61d374c9-8bf7-45f0-bfd6-c10b97de5196';

// Script content from database
const rawScript = `Breaking news from Washington today as the Senate passes landmark climate legislation with overwhelming bipartisan support. The Clean Energy Innovation Act, which has been in development for over eight months, secured 73 votes in favor with only 27 opposed, marking one of the most significant environmental achievements in recent history.

The legislation allocates 500 billion dollars over the next decade to renewable energy infrastructure, electric vehicle incentives, and carbon capture technology. President Martinez called it a defining moment for American climate policy, stating that the nation is finally taking concrete steps to address the climate crisis while creating hundreds of thousands of green jobs.

Environmental groups have praised the bill's ambitious targets, though some activists argue it doesn't go far enough. The Act mandates a 40 percent reduction in greenhouse gas emissions by 2030 and sets a goal of net-zero emissions by 2045. Industry leaders in the renewable energy sector have already announced plans to expand operations, anticipating the economic boost from federal support.

In international news, tensions continue to escalate in the South China Sea as naval forces from three countries conduct simultaneous exercises in disputed waters. The United States, Australia, and Japan launched joint naval drills this morning, prompting strong criticism from Beijing, which views the exercises as a provocation. China's Foreign Ministry issued a statement calling the drills unnecessary and destabilizing, warning that such actions could undermine regional peace.

Military analysts suggest the exercises are intended to demonstrate resolve in maintaining freedom of navigation, but concerns are mounting that the situation could spiral into a more serious confrontation. The European Union has called for dialogue and de-escalation, with Germany's foreign minister urging all parties to respect international maritime law and avoid actions that could trigger conflict.

Meanwhile, European financial markets experienced significant volatility today as new economic data revealed slower-than-expected growth across the Eurozone. Stock indices in Frankfurt, Paris, and London all closed down more than 2 percent, with investors reacting to inflation figures that remain stubbornly high despite recent interest rate hikes by the European Central Bank.

Economists are divided on whether the current slowdown signals the beginning of a recession or merely a temporary adjustment as the region adapts to tighter monetary policy. Consumer confidence has declined for the third consecutive month, raising concerns about holiday spending and its impact on retail sectors already struggling with supply chain disruptions.

In technology news, a major breakthrough in quantum computing has been announced by researchers at the Institute for Advanced Physics. Scientists have successfully demonstrated a new quantum processor capable of solving complex calculations that would take traditional supercomputers thousands of years to complete. The achievement represents a significant leap forward in the race to develop practical quantum computers.

The new processor uses a novel approach to error correction, addressing one of the biggest challenges in quantum computing. Industry experts believe this development could accelerate the timeline for commercial quantum applications, potentially revolutionizing fields ranging from drug discovery to cryptography within the next decade.

And in sports, the World Cup qualifying matches concluded with several surprising upsets. Defending champion Brazil was held to a draw by Ecuador in a match that shocked fans worldwide, while underdog Peru secured a stunning victory over Argentina with a last-minute goal. The results have shaken up the standings and made the path to the World Cup far less certain for several traditional powerhouses.

That wraps up our top stories for today. Stay tuned for more updates as these events continue to develop.`;

console.log('📤 Queueing job for analysis...');
console.log(`Job ID: ${JOB_ID}`);
console.log(`Script length: ${rawScript.length} characters`);

queueAnalyze.add('analyze-script', {
  jobId: JOB_ID,
  rawScript: rawScript,
  provider: 'google'
}).then(job => {
  console.log(`✅ Queued successfully (BullMQ Job ID: ${job.id})`);
  return queueAnalyze.close();
}).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
