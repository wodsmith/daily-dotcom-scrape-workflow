import { WodAnalysisAgent } from '../src/ai/agent';

// Mock AI binding for testing
const mockAI = {
	run: async (model: string, options: any) => {
		// Return a mock response that mimics the expected format
		if (options.messages[0].content.includes('structured workout object')) {
			return JSON.stringify({
				id: "amrap-burpees-pullups-squats",
				name: "AMRAP Burpees, Pull-ups & Squats",
				description: "A 20-minute AMRAP consisting of burpees, pull-ups, and air squats",
				scope: "private",
				scheme: "rounds-reps",
				repsPerRound: 45,
				roundsToScore: 1,
				tiebreakScheme: null,
				secondaryScheme: null
			});
		} else if (options.messages[0].content.includes('JSON format')) {
			return JSON.stringify({
				summary: "A test CrossFit workout",
				movements: ["burpees", "pull-ups", "squats"],
				difficulty: "intermediate",
				estimatedTime: "15-20 minutes",
				equipment: ["pull-up bar"],
				tags: ["amrap", "bodyweight"]
			});
		} else {
			return "1. Beginner version: Half the reps\n2. Intermediate version: As prescribed\n3. Advanced version: Add weight";
		}
	}
} as any;

async function testAIAgent() {
	console.log('Testing WOD Analysis Agent...');

	const agent = new WodAnalysisAgent(mockAI);

	// Test WOD analysis
	const testWod = "AMRAP 20:\n10 Burpees\n15 Pull-ups\n20 Air Squats";

	try {
		// Test structured workout object generation
		const workoutObject = await agent.generateWorkoutObject(testWod);
		console.log('✅ Workout object generation successful:');
		console.log('  ID:', workoutObject.id);
		console.log('  Name:', workoutObject.name);
		console.log('  Scheme:', workoutObject.scheme);
		console.log('  Reps per round:', workoutObject.repsPerRound);
		console.log('  Description:', workoutObject.description.substring(0, 50) + '...');

		// Test legacy WOD analysis
		const analysis = await agent.analyzeWod(testWod);
		console.log('✅ WOD Analysis successful:');
		console.log('  Summary:', analysis.summary);
		console.log('  Difficulty:', analysis.difficulty);
		console.log('  Movements:', analysis.movements.join(', '));
		console.log('  Equipment:', analysis.equipment.join(', '));

		// Test suggestions
		const suggestions = await agent.generateWorkoutSuggestions({ wodText: testWod });
		console.log('✅ Workout suggestions successful:');
		suggestions.forEach((suggestion, index) => {
			console.log(`  ${index + 1}. ${suggestion}`);
		});

		console.log('\n🎉 All AI agent tests passed!');
	} catch (error) {
		console.error('❌ Test failed:', error);
	}
}

if (import.meta.main) {
	testAIAgent();
}

export { testAIAgent };
