// Mock Claude types for compatibility
interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ClaudeResponse {
  content: string;
  model?: string;
  usage?: any;
}

export class MockAIService {
  private responses: { [key: string]: string } = {
    'hello': 'สวัสดีครับ! ผมเป็น AI Assistant พร้อมช่วยเหลือคุณแล้ว',
    'help': 'ผมสามารถช่วยคุณในเรื่องต่างๆ ได้ เช่น:\n- ตอบคำถามทั่วไป\n- ช่วยเขียนโค้ด\n- แนะนำวิธีแก้ปัญหา\n- อธิบายแนวคิดต่างๆ',
    'code': '```javascript\n// ตัวอย่างโค้ด\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}\n```',
    'error': 'ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง',
  };

  async initialize(): Promise<void> {
    console.log('[MockAI] Service initialized');
    return Promise.resolve();
  }

  async sendMessage(message: string, context?: ClaudeMessage[]): Promise<ClaudeResponse> {
    console.log('[MockAI] Received message:', message);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const lowerMessage = message.toLowerCase();
    
    // Check for keywords and return appropriate response
    if (lowerMessage.includes('hello') || lowerMessage.includes('สวัสดี')) {
      return {
        content: this.responses.hello,
        model: 'mock-ai'
      };
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('ช่วย')) {
      return {
        content: this.responses.help,
        model: 'mock-ai'
      };
    }
    
    if (lowerMessage.includes('code') || lowerMessage.includes('โค้ด')) {
      return {
        content: this.responses.code,
        model: 'mock-ai'
      };
    }
    
    if (lowerMessage.includes('error') || lowerMessage.includes('ผิดพลาด')) {
      return {
        content: this.responses.error,
        model: 'mock-ai'
      };
    }
    
    // Generate contextual response
    const contextInfo = context && context.length > 0 
      ? `\n\n(บทสนทนาก่อนหน้า: ${context.length} ข้อความ)`
      : '';
    
    // Default intelligent response
    const responses = [
      `ผมเข้าใจคำถามของคุณเกี่ยวกับ "${message}" แล้วครับ${contextInfo}`,
      `นี่คือคำตอบสำหรับ: ${message}\n\n**หัวข้อหลัก:**\n1. การวิเคราะห์คำถาม\n2. แนวทางการแก้ไข\n3. ข้อเสนอแนะเพิ่มเติม`,
      `ขอบคุณสำหรับคำถาม! เกี่ยวกับ "${message}" นั้น มีหลายแง่มุมที่น่าสนใจครับ`,
      `## ${message}\n\nนี่คือข้อมูลที่คุณต้องการ:\n\n- **ข้อมูลที่ 1**: คำอธิบาย\n- **ข้อมูลที่ 2**: ตัวอย่าง\n- **ข้อมูลที่ 3**: การนำไปใช้`,
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      content: randomResponse,
      model: 'mock-ai'
    };
  }

  async analyzeCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return {
      content: `## การวิเคราะห์โค้ด ${language}\n\n**โครงสร้าง:** ดี\n**ประสิทธิภาพ:** ปานกลาง\n**ข้อเสนอแนะ:** ควรเพิ่ม error handling`,
      model: 'mock-ai'
    };
  }

  async generateCode(requirements: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    const code = `\`\`\`${language}
// Generated code based on: ${requirements}
function example() {
  // Implementation here
  return 'Generated result';
}

export default example;
\`\`\``;
    
    return {
      content: code,
      model: 'mock-ai'
    };
  }

  async explainCode(code: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return {
      content: `## คำอธิบายโค้ด\n\nโค้ดนี้เป็นภาษา ${language} ที่ทำหน้าที่:\n1. ประมวลผลข้อมูล\n2. คืนค่าผลลัพธ์\n3. จัดการ error`,
      model: 'mock-ai'
    };
  }

  async debugCode(code: string, error: string, language: string = 'typescript'): Promise<ClaudeResponse> {
    return {
      content: `## การแก้ไข Error\n\n**ข้อผิดพลาด:** ${error}\n\n**สาเหตุ:** syntax error หรือ logic error\n\n**วิธีแก้:**\n1. ตรวจสอบ syntax\n2. เพิ่ม try-catch\n3. ตรวจสอบ null/undefined`,
      model: 'mock-ai'
    };
  }

  terminate(): void {
    console.log('[MockAI] Service terminated');
  }
}