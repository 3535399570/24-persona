@echo off
chcp 65001 >nul
echo 正在把 24-persona 发布到 GitHub（会弹出一次登录窗口，登录 3535399570 即可）...
git config --global credential.helper manager
git push -u origin main
if errorlevel 1 goto fail
git push origin gh-pages
if errorlevel 1 goto fail
echo.
echo 完成！链接（Pages 首次生效约 1 分钟）：
echo https://3535399570.github.io/24-persona/
pause
exit /b 0
:fail
echo.
echo 推送失败：如果提示 repository not found，请先在 https://github.com/new 建一个叫 24-persona 的空仓库（Public，不要勾任何初始化文件）。
pause
exit /b 1
