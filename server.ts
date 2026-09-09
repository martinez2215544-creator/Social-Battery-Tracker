import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Heuristic fallback for Percentage Computation
function computePercentageFallback(body: any) {
  const {
    name,
    type,
    durationHours,
    groupSize,
    noiseLevel,
    maskingDemand,
    familiarity,
    notes,
    currentBattery,
  } = body;

  let baseDrainPerHour = type === 'social' ? 18 : type === 'work' ? 14 : type === 'solo' ? -15 : -25;
  if (groupSize && (groupSize > 5 || /large|7\+/i.test(String(groupSize)))) baseDrainPerHour += 6;
  if (noiseLevel === 'loud' || /loud|intense/i.test(String(noiseLevel))) baseDrainPerHour += 8;
  if (maskingDemand === 'high' || /high|constant/i.test(String(maskingDemand))) baseDrainPerHour += 10;
  if (familiarity === 'strangers' || /stranger/i.test(String(familiarity))) baseDrainPerHour += 6;
  if (familiarity === 'close_friends' || /close|family/i.test(String(familiarity))) baseDrainPerHour -= 4;

  const duration = durationHours || 1.5;
  let totalCalculated = Math.round(baseDrainPerHour * duration);
  const energyImpact = type === 'solo' || type === 'rest' 
    ? Math.min(100, Math.max(5, Math.abs(totalCalculated)))
    : -Math.min(100, Math.max(5, Math.abs(totalCalculated)));

  const icon = type === 'solo' ? 'self_improvement' : type === 'rest' ? 'bedtime' : type === 'work' ? 'groups' : 'restaurant';
  const categoryLabel = type === 'solo' ? 'SOLO RECHARGE' : type === 'rest' ? 'REST & RESTORATION' : type === 'work' ? 'WORK MEETING' : 'SOCIAL GATHERING';
  const mood = energyImpact < -40 ? 'Exhausted' : energyImpact < -15 ? 'Content but Tired' : energyImpact > 15 ? 'Energized' : 'Calm & Rested';

  return {
    energyImpact,
    impactLabel: energyImpact <= -50 ? 'Significant drain' : energyImpact < 0 ? 'Moderate drain' : 'Restorative boost',
    type: type || 'social',
    categoryLabel,
    mood,
    iconName: icon,
    durationLabel: duration > 2 ? 'Extended session' : duration >= 1 ? 'Standard session' : 'Brief session',
    breakdown: [
      { factor: `Duration (${duration}h)`, impact: Math.round(energyImpact * 0.4), rationale: 'Time commitment & continuous social presence' },
      { factor: 'Interaction Depth & Dynamics', impact: Math.round(energyImpact * 0.35), rationale: 'Cognitive social processing and conversational load' },
      { factor: 'Environment & Sensory Input', impact: Math.round(energyImpact * 0.25), rationale: 'Acoustic background stimulation and crowd size' },
    ],
    aiRationale: `Calculated a ${energyImpact > 0 ? '+' : ''}${energyImpact}% social battery shift for "${name || 'Activity'}" based on ${duration}h ${type || 'social'} dynamics and sensory load.`,
    rechargeRecommendation: energyImpact < 0 
      ? `Schedule a 20-30 min quiet solo recharge to recover ${Math.abs(Math.round(energyImpact * 0.6))}% energy.` 
      : 'Continue enjoying your restored social equilibrium.',
    recommendedRechargeAmount: energyImpact < 0 ? Math.min(50, Math.abs(Math.round(energyImpact * 0.6))) : 0,
  };
}

// Heuristic fallback for Natural Language Activity Prompt
function smartNlpLogFallback(text: string, currentBattery?: number) {
  const startingBattery = typeof currentBattery === 'number' ? currentBattery : 50;
  const isSolo = /walk|read|book|meditat|bath|relax|gaming|alone|quiet|tea|spa/i.test(text);
  const isWork = /meeting|standup|boss|client|presentation|interview|work|deadline|sync|office/i.test(text);
  const isRest = /sleep|nap|bed|rest|breathing|lay down/i.test(text);
  
  let duration = 1.5;
  const durationMatch = text.match(/(\d+(\.\d+)?)\s*(h|hr|hour|hours|m|min|minute|minutes)/i);
  if (durationMatch) {
    if (/m|min/i.test(durationMatch[3])) {
      duration = Math.max(0.25, parseFloat(durationMatch[1]) / 60);
    } else {
      duration = parseFloat(durationMatch[1]);
    }
  }

  let energyImpact = 0;
  if (isRest) {
    energyImpact = Math.min(65, Math.round(duration * 20));
  } else if (isSolo) {
    energyImpact = Math.min(45, Math.round(duration * 14));
  } else if (isWork) {
    energyImpact = -Math.min(70, Math.round(duration * 16));
  } else {
    // Social
    const isLoud = /loud|party|club|crowd|bar|festival|wedding|gathering|many|lots/i.test(text);
    const baseRate = isLoud ? 22 : 15;
    energyImpact = -Math.min(85, Math.round(duration * baseRate));
  }

  const newBattery = Math.min(100, Math.max(0, startingBattery + energyImpact));
  const cleanDuration = Math.round(duration * 10) / 10;
  const activityType = isRest ? 'rest' : isSolo ? 'solo' : isWork ? 'work' : 'social';

  return {
    name: text.length > 35 ? text.slice(0, 32) + '...' : text,
    type: activityType,
    categoryLabel: isRest ? 'REST & RESTORATION' : isSolo ? 'SOLO RECHARGE' : isWork ? 'WORK MEETING' : 'SOCIAL GATHERING',
    durationHours: cleanDuration,
    durationLabel: `${cleanDuration}h session`,
    energyImpact,
    previousBattery: startingBattery,
    newCalculatedBattery: newBattery,
    impactLabel: energyImpact <= -40 ? 'Significant drain' : energyImpact < 0 ? 'Moderate drain' : energyImpact < 40 ? 'Gentle restore' : 'Deep recharge',
    mood: energyImpact < -35 ? 'Exhausted' : energyImpact < 0 ? 'Content but Tired' : energyImpact > 30 ? 'Energized' : 'Calm & Rested',
    iconName: isRest ? 'bedtime' : isSolo ? 'self_improvement' : isWork ? 'groups' : 'restaurant',
    notes: text,
    breakdown: [
      { factor: `Duration (${cleanDuration}h)`, impact: Math.round(energyImpact * 0.5), rationale: 'Time commitment & continuous presence' },
      { factor: 'Social Interaction Depth', impact: Math.round(energyImpact * 0.35), rationale: 'Cognitive, verbal, and sensory demands' },
      { factor: 'Emotional & Masking Load', impact: Math.round(energyImpact * 0.15), rationale: 'Self-monitoring and behavioral filtering' },
    ],
    aiRationale: `AI analyzed your activity "${text.slice(0, 40)}" and calculated a ${energyImpact > 0 ? '+' : ''}${energyImpact}% battery shift, controlling your social battery from ${startingBattery}% to ${newBattery}%.`,
    batteryAdjustmentExplanation: `Controlled battery by ${energyImpact > 0 ? '+' : ''}${energyImpact}% based on activity duration and emotional load.`,
    rechargeRecommendation: energyImpact < 0 ? 'Schedule 20-30 min of low-stimulus quiet time to begin recovery.' : 'Enjoy your replenished social equilibrium.',
    recommendedRechargeAmount: energyImpact < 0 ? Math.min(45, Math.abs(Math.round(energyImpact * 0.6))) : 0,
  };
}

// Heuristic fallback for Battery State Analysis
function batteryStateAnalysisFallback(currentEnergy: number, burnoutLogsCount: number) {
  const safeEnergy = typeof currentEnergy === 'number' ? currentEnergy : 50;
  const drainRate = safeEnergy < 30 ? 14 : safeEnergy < 60 ? 10 : 8;
  const hoursLeft = Math.max(0.5, Math.round((safeEnergy / drainRate) * 10) / 10);
  const burnoutRisk = Math.max(5, Math.min(95, 100 - safeEnergy + (burnoutLogsCount || 0) * 8));

  return {
    burnoutRiskIndex: burnoutRisk,
    drainVelocityPerHour: drainRate,
    predictedHoursRemaining: hoursLeft,
    batteryHealthStatus: safeEnergy > 70 ? 'Resilient & Thriving' : safeEnergy > 35 ? 'Moderate Reserve' : 'Depleted - Quiet Mode Needed',
    aiDiagnostic: `Your battery is currently at ${safeEnergy}%. Estimated burn rate is ~${drainRate}%/hr in typical social settings, giving approx. ${hoursLeft}h endurance.`,
    recommendedActions: [
      { label: '15-min Sensory Detox', recoveryBoost: 20, icon: 'self_improvement' },
      { label: 'Unplugged Nature Walk', recoveryBoost: 25, icon: 'directions_run' },
      { label: 'Deep Box Breathing', recoveryBoost: 15, icon: 'bedtime' },
    ],
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // AI Percentage Computation: Analyze any activity and calculate exact percentage drain/recharge
  app.post('/api/ai/compute-percentage', async (req, res) => {
    const ai = getAI();

    if (!ai) {
      return res.json(computePercentageFallback(req.body));
    }

    try {
      const {
        name,
        type,
        durationHours,
        groupSize,
        noiseLevel,
        maskingDemand,
        familiarity,
        notes,
        currentBattery,
      } = req.body;

      const prompt = `You are the core neuro-social algorithm for the "Ebb & Flow Social Battery Tracker".
Calculate the precise, scientifically realistic social battery percentage impact (+/- 1% to 100%) for this event:
- Activity Name / Description: "${name || 'Social Activity'}"
- Activity Type: "${type || 'social'}"
- Duration in Hours: ${durationHours || 1}
- Group Size Context: ${groupSize || 'Medium (3-6 people)'}
- Noise / Sensory Level: ${noiseLevel || 'Moderate'}
- Masking Demand (effort to appear outgoing/filtered): ${maskingDemand || 'Moderate'}
- Familiarity with People: ${familiarity || 'Casual Friends / Acquaintances'}
- Notes / Context: "${notes || 'None'}"
- User's Current Social Battery: ${currentBattery !== undefined ? currentBattery : 50}%

INSTRUCTIONS:
1. Drains should be NEGATIVE integers (e.g., -35, -50, -18). Recharges (solo time, quiet rest, meditation) should be POSITIVE integers (e.g., +20, +45).
2. Calculate a granular breakdown of contributing factors (e.g. Duration factor, Crowd/Noise factor, Masking load, Shared laughter/connection buff).
3. Select an appropriate mood from: 'Energized', 'Content', 'Content but Tired', 'Tired', 'Exhausted', 'Calm & Rested'.
4. Select a fitting Google Material Symbol iconName (e.g. 'restaurant', 'coffee', 'local_bar', 'groups', 'work', 'self_improvement', 'bedtime', 'sports_esports', 'fitness_center', 'directions_run', 'flight', 'music_note', 'movie', 'pets', 'spa', 'shopping_bag', 'home', 'chat').
5. Provide a 2-sentence empathetic psychological AI Rationale explaining why this percentage was computed.
6. Provide a tailored Recharge Recommendation with an estimated % recovery bonus.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              energyImpact: {
                type: Type.INTEGER,
                description: 'Exact percentage drain (negative e.g. -35) or recharge (positive e.g. 25)',
              },
              impactLabel: {
                type: Type.STRING,
                description: 'Short phrase e.g. "Significant drain", "Moderate drain", "Deep recharge"',
              },
              categoryLabel: {
                type: Type.STRING,
                description: 'e.g. "SOCIAL GATHERING", "WORK COLLABORATION", "SOLO RECHARGE", "REST & RESTORATION"',
              },
              mood: {
                type: Type.STRING,
                description: 'Must be one of: Energized, Content, Content but Tired, Tired, Exhausted, Calm & Rested',
              },
              iconName: {
                type: Type.STRING,
                description: 'Material Symbol name e.g. restaurant, groups, work, self_improvement, bedtime, local_bar',
              },
              durationLabel: {
                type: Type.STRING,
                description: 'e.g. "High intensity 2.5h", "Quick recharge", "Extended gathering"',
              },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING, description: 'Factor name e.g. Group Size (8 people)' },
                    impact: { type: Type.INTEGER, description: 'Factor percentage e.g. -15 or +5' },
                    rationale: { type: Type.STRING, description: 'Why this factor impacted battery' },
                  },
                  required: ['factor', 'impact', 'rationale'],
                },
              },
              aiRationale: {
                type: Type.STRING,
                description: '2 sentence scientific and psychological explanation of the net percentage',
              },
              rechargeRecommendation: {
                type: Type.STRING,
                description: 'Prescription for restoring battery after this event',
              },
              recommendedRechargeAmount: {
                type: Type.INTEGER,
                description: 'Suggested recovery boost amount in % e.g. 20',
              },
            },
            required: [
              'energyImpact',
              'impactLabel',
              'categoryLabel',
              'mood',
              'iconName',
              'durationLabel',
              'breakdown',
              'aiRationale',
              'rechargeRecommendation',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.warn('[AI Engine] Gemini API unavailable or permission error, using neuro-social intelligence fallback:', err?.message || err);
      return res.json(computePercentageFallback(req.body));
    }
  });

  // AI Smart NLP Log: One-shot natural language parser into a complete battery event with computed %
  app.post('/api/ai/smart-nlp-log', async (req, res) => {
    const { text, currentBattery } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const startingBattery = typeof currentBattery === 'number' ? currentBattery : 50;
    const ai = getAI();

    if (!ai) {
      return res.json(smartNlpLogFallback(text, startingBattery));
    }

    try {
      const prompt = `You are the authoritative neuro-social AI battery controller for the "Ebb & Flow Social Battery Tracker".
The user has provided this activity prompt:
"${text}"
User's Current Social Battery: ${startingBattery}%

INSTRUCTIONS:
1. Act as an authoritative, scientifically realistic social battery controller.
2. Determine the concise Event Name (3-5 words).
3. Determine Inferred Activity Type ('social', 'work', 'solo', 'rest').
4. Determine Inferred Duration in Hours (e.g. 0.5, 1, 2.5). If unmentioned, estimate realistically.
5. Compute the EXACT percentage energy impact:
   - Drains MUST be negative integers (e.g. -45 for loud 3h party, -25 for 1.5h dinner, -30 for tense work meeting, -12 for casual 1-on-1 coffee).
   - Recharges MUST be positive integers (e.g. +20 for quiet solo walk, +30 for reading/tea, +40 for meditation/nap, +65 for deep night sleep).
6. Calculate the newBattery percentage: clamp between 0 and 100 (${startingBattery} + energyImpact).
7. Generate a 3-part granular factor breakdown detailing why duration, crowd/noise, and masking caused this specific percentage.
8. Pick an accurate mood and Material Symbol icon name.
9. Write a 2-sentence empathetic AI Rationale explaining how the AI controlled and adjusted the battery percentage based on the prompt.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING, enum: ['social', 'work', 'solo', 'rest'] },
              categoryLabel: { type: Type.STRING },
              durationHours: { type: Type.NUMBER },
              durationLabel: { type: Type.STRING },
              energyImpact: { type: Type.INTEGER, description: 'Percentage delta e.g. -35 or +20' },
              impactLabel: { type: Type.STRING },
              mood: { type: Type.STRING },
              iconName: { type: Type.STRING },
              notes: { type: Type.STRING },
              breakdown: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    factor: { type: Type.STRING },
                    impact: { type: Type.INTEGER },
                    rationale: { type: Type.STRING },
                  },
                  required: ['factor', 'impact', 'rationale'],
                },
              },
              aiRationale: { type: Type.STRING },
              batteryAdjustmentExplanation: { type: Type.STRING },
              rechargeRecommendation: { type: Type.STRING },
              recommendedRechargeAmount: { type: Type.INTEGER },
            },
            required: [
              'name',
              'type',
              'categoryLabel',
              'durationHours',
              'durationLabel',
              'energyImpact',
              'impactLabel',
              'mood',
              'iconName',
              'breakdown',
              'aiRationale',
              'rechargeRecommendation',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const impact = typeof parsed.energyImpact === 'number' ? parsed.energyImpact : -20;
      parsed.previousBattery = startingBattery;
      parsed.newCalculatedBattery = Math.min(100, Math.max(0, startingBattery + impact));
      if (!parsed.batteryAdjustmentExplanation) {
        parsed.batteryAdjustmentExplanation = `AI adjusted social battery from ${startingBattery}% to ${parsed.newCalculatedBattery}% (${impact > 0 ? '+' : ''}${impact}%).`;
      }
      return res.json(parsed);
    } catch (err: any) {
      console.warn('[AI Engine] Gemini API unavailable or permission error, using smart NLP fallback:', err?.message || err);
      return res.json(smartNlpLogFallback(text, startingBattery));
    }
  });

  // AI Battery Forecast & Health State Analyzer
  app.post('/api/ai/analyze-battery-state', async (req, res) => {
    const { currentEnergy, recentEvents, burnoutLogsCount } = req.body;
    const ai = getAI();

    if (!ai) {
      return res.json(batteryStateAnalysisFallback(currentEnergy, burnoutLogsCount));
    }

    try {
      const prompt = `Analyze this user's social energy state and compute precise real-time percentage diagnostics:
Current Energy: ${currentEnergy}%
Recent Logged Events: ${JSON.stringify(recentEvents || []).slice(0, 1000)}
Burnout Entries Count: ${burnoutLogsCount || 0}

Compute:
1. burnoutRiskIndex: integer (0 - 100%)
2. drainVelocityPerHour: estimated hourly percentage drain in current flow (integer)
3. predictedHoursRemaining: hours until battery hits critical 0% if active
4. batteryHealthStatus: short phrase (e.g. "Rapid Drain Warning", "Stable Equilibrium", "High Masking Fatigue", "Restored & Clear")
5. aiDiagnostic: 2-sentence analytical summary
6. recommendedActions: 3 personalized recovery activities with exact percentage recovery values (+10% to +35%)`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              burnoutRiskIndex: { type: Type.INTEGER },
              drainVelocityPerHour: { type: Type.INTEGER },
              predictedHoursRemaining: { type: Type.NUMBER },
              batteryHealthStatus: { type: Type.STRING },
              aiDiagnostic: { type: Type.STRING },
              recommendedActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    recoveryBoost: { type: Type.INTEGER },
                    icon: { type: Type.STRING },
                  },
                  required: ['label', 'recoveryBoost', 'icon'],
                },
              },
            },
            required: [
              'burnoutRiskIndex',
              'drainVelocityPerHour',
              'predictedHoursRemaining',
              'batteryHealthStatus',
              'aiDiagnostic',
              'recommendedActions',
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return res.json(parsed);
    } catch (err: any) {
      console.warn('[AI Engine] Gemini API unavailable or permission error, using battery diagnostic fallback:', err?.message || err);
      return res.json(batteryStateAnalysisFallback(currentEnergy, burnoutLogsCount));
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ebb & Flow AI Server running on port ${PORT}`);
  });
}

startServer();

