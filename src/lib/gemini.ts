import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const addJobApplicationDeclaration: FunctionDeclaration = {
  name: 'addJobApplication',
  description: 'Add a new job application to the tracker.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: 'Name of the company' },
      role: { type: Type.STRING, description: 'Job role or title' },
      dateApplied: { type: Type.STRING, description: 'Date applied in YYYY-MM-DD format. If not specified, use today.' },
      status: { 
        type: Type.STRING, 
        description: 'Current status of the application',
        enum: ['Applied', 'Pending', 'Interviewing', 'Selected', 'Rejected', 'Offer']
      },
      notes: { type: Type.STRING, description: 'Any additional notes or details' }
    },
    required: ['company', 'role', 'dateApplied', 'status']
  }
};

export const updateJobApplicationDeclaration: FunctionDeclaration = {
  name: 'updateJobApplication',
  description: 'Update an existing job application status or notes.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      company: { type: Type.STRING, description: 'Name of the company to update' },
      status: { 
        type: Type.STRING, 
        description: 'New status of the application',
        enum: ['Applied', 'Pending', 'Interviewing', 'Selected', 'Rejected', 'Offer']
      },
      notes: { type: Type.STRING, description: 'Additional notes to append' }
    },
    required: ['company']
  }
};

export async function processUserMessage(contents: any[]) {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: contents,
    config: {
      systemInstruction: `You are a helpful job application tracking assistant. 
Your job is to help the user track their job applications.
When the user tells you about a new application or uploads an image of an email/application, extract the details and use the addJobApplication tool.
When the user tells you about an update to an existing application, use the updateJobApplication tool.
Always be encouraging and concise. If you use a tool, confirm to the user what you did.
Today's date is ${new Date().toISOString().split('T')[0]}.`,
      tools: [{ functionDeclarations: [addJobApplicationDeclaration, updateJobApplicationDeclaration] }],
      temperature: 0.2,
    }
  });

  return response;
}
