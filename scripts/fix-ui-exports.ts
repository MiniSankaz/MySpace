import fs from 'fs';
import path from 'path';

const UI_DIR = path.join(process.cwd(), 'src/components/ui');

// List of UI components that need fixing
const componentsToFix = [
  'Alert.tsx',
  'Badge.tsx',
  'Input.tsx',
  'Loading.tsx',
  'Modal.tsx',
  'Pagination.tsx',
  'Select.tsx'
];

function fixComponentExport(filePath: string) {
  const fileName = path.basename(filePath, '.tsx');
  const componentName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has export default
    if (content.includes(`export default ${componentName}`)) {
      // Replace export default with export named
      content = content.replace(
        new RegExp(`export default (function )?${componentName}`, 'g'),
        `export function ${componentName}`
      );
      
      // Add default export at the end if not exists
      if (!content.includes(`export default ${componentName};`)) {
        content += `\n// Export as default for backward compatibility\nexport default ${componentName};\n`;
      }
      
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${fileName}`);
    } else if (content.includes(`export default`)) {
      // Handle other default export patterns
      const defaultExportMatch = content.match(/export default (\w+)/);
      if (defaultExportMatch) {
        const exportedName = defaultExportMatch[1];
        
        // Add named export
        if (!content.includes(`export { ${exportedName} }`)) {
          content = content.replace(
            /export default (\w+);?/,
            `export { $1 };\nexport default $1;`
          );
          
          // If the component name doesn't match filename, add alias
          if (exportedName !== componentName) {
            content = content.replace(
              `export { ${exportedName} };`,
              `export { ${exportedName} as ${componentName} };\nexport { ${exportedName} };`
            );
          }
          
          fs.writeFileSync(filePath, content);
          console.log(`✅ Fixed: ${fileName}`);
        }
      }
    } else {
      console.log(`⏭️  Skipped: ${fileName} (no default export found)`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${fileName}:`, error);
  }
}

console.log('🔧 Fixing UI component exports...\n');

componentsToFix.forEach(file => {
  const filePath = path.join(UI_DIR, file);
  if (fs.existsSync(filePath)) {
    fixComponentExport(filePath);
  } else {
    console.log(`⚠️  File not found: ${file}`);
  }
});

console.log('\n✨ Done!');