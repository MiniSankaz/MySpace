'use client';

export default function TestCSS() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-white text-2xl mb-8">ทดสอบ CSS Messages</h1>
      
      <div className="max-w-3xl mx-auto space-y-4">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="message-bubble user">
            <p>นี่คือข้อความจากผู้ใช้ - ควรเป็นตัวหนังสือสีขาวบนพื้นหลังสีน้ำเงิน</p>
            <p>This is user message - should be white text on blue background</p>
          </div>
        </div>
        
        {/* Assistant Message */}
        <div className="flex justify-start">
          <div className="message-bubble assistant">
            <p>นี่คือข้อความจาก Assistant - ควรเป็นตัวหนังสือสีดำบนพื้นหลังสีอ่อน</p>
            <p>This is assistant message - should be dark text on light background</p>
          </div>
        </div>
        
        {/* Test inline styles */}
        <div className="flex justify-end">
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 20px',
            borderRadius: '20px 20px 4px 20px',
            maxWidth: '70%'
          }}>
            <p>ทดสอบ inline style - สีขาวบนพื้นสีน้ำเงิน</p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-white mb-2">CSS Status:</h2>
        <pre className="text-green-400 text-xs">
{`/* From assistant-messages.css */
.message-bubble.user {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff !important;
}`}
        </pre>
      </div>
    </div>
  );
}