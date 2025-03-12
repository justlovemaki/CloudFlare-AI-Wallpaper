export default {
    async fetch(request) {
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>AI壁纸生成</title>
            <style>
              .button-container { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin: 30px; }
              .style-button { padding: 6px 6px; background: #f0f0f0; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
              .style-button:hover { background: #e0e0e0; }
              .style-button.active { background: #333; color: white; }
              #addStyleButton { background: #4CAF50; color: white; }
              #addStyleButton.active { background: white; color: #333; }
              #image-container { display: flex; justify-content: center; height: 70vh; }
              #display-image { max-width: 95%; max-height: 95%; }
            </style>
          </head>
          <body>
            <h1 style="text-align: center;">选择你喜欢的壁纸风格</h1>
            <div class="button-container">
              ${["简约风格", "文艺风格", "自然风景风格", "动物主题风格", "动漫风格", "游戏风格", "星空宇宙风格", "创意抽象风格", "建筑风格", "复古风格", "民族异域风", "乡村田园风", "新中式风格", "欧式古典风格", "花卉和植物风格", "几何和抽象风格"].map(style => 
                `<div class="style-button" data-style="${style}">${style}</div>`
              ).join('')}
              <div class="style-button" id="addStyleButton">增加风格</div>
            </div>
            <div id="image-container"><img id="display-image" src="" alt="生成的图片"></div> 
            <script>
              const styles = document.querySelectorAll('.style-button');
              const image = document.getElementById('display-image');
              
              const showStyle = style => {
                const randomString = Math.random().toString(36).substring(2, 15); // 生成随机字符串
                const url = \`https://文生图服务路径/?model=FLUX.1-Schnell-CF&width=720&height=1280&expand=1&prompt=\${encodeURIComponent(style)}++\${randomString}\`;
                image.src = url;
              };
  
              styles.forEach(button => {
                button.addEventListener('click', e => {
                  if (e.target.id === 'addStyleButton') {
                    const newStyle = prompt('请输入自定义风格名称：');
                    if (newStyle) {
                      const newButton = document.createElement('div');
                      newButton.className = 'style-button';
                      newButton.dataset.style = newStyle;
                      newButton.textContent = newStyle;
                      newButton.addEventListener('click', e => handleStyleClick(e, true));
                      document.querySelector('.button-container').appendChild(newButton);
                    }
                  } else {
                    handleStyleClick(e, false);
                  }
                });
              });
  
              const handleStyleClick = (e, isNew) => {
                const style = isNew ? e.target.textContent : e.target.dataset.style;
                if (confirm(\`你确定要选择 \${style} 吗？\`)) {
                  // 移除所有按钮的 active 类
                  document.querySelectorAll('.style-button').forEach(btn => {
                    btn.classList.remove('active');
                  });
                  // 为当前点击的按钮添加 active 类
                  e.target.classList.add('active');
                  showStyle(style);
                } else {
                  // 移除当前按钮的 active 类（如果之前添加过）
                  e.target.classList.remove('active');
                }
              };
            </script>
          </body>
        </html>
      `;
  
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    },
  };