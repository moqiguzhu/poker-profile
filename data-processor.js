// 游戏数据处理和用户画像计算
class DataProcessor {
    constructor() {
        this.gameData = [];
        this.userStats = new Map();
        this.validUserIds = new Set();
    }

    // 解析CSV数据
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length === headers.length) {
                const record = {};
                headers.forEach((header, index) => {
                    record[header.trim()] = values[index].trim();
                });
                
                // 转换数据类型
                record.score = parseInt(record.score);
                record.isWin = record.result_type === '胜利';
                
                this.gameData.push(record);
                this.validUserIds.add(record.player_id);
            }
        }
    }

    // 计算用户统计数据
    calculateUserStats() {
        const userGames = new Map();
        
        // 按用户分组游戏记录
        this.gameData.forEach(record => {
            if (!userGames.has(record.player_id)) {
                userGames.set(record.player_id, []);
            }
            userGames.get(record.player_id).push(record);
        });

        // 计算总比赛场次
        const totalMatches = new Set(this.gameData.map(r => r.match_date)).size;

        // 为每个用户计算统计数据
        userGames.forEach((records, userId) => {
            const totalGames = records.length;
            const wins = records.filter(r => r.isWin).length;
            const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
            
            const scores = records.map(r => r.score);
            const totalScore = scores.reduce((sum, score) => sum + score, 0);
            const avgScore = totalGames > 0 ? totalScore / totalGames : 0;
            const maxScore = Math.max(...scores);
            
            // 计算得分标准差（波动率）
            const scoreVariance = scores.reduce((sum, score) => 
                sum + Math.pow(score - avgScore, 2), 0) / totalGames;
            const scoreStdDev = Math.sqrt(scoreVariance);
            
            // 出勤率
            const userMatchDates = new Set(records.map(r => r.match_date));
            const attendanceRate = (userMatchDates.size / totalMatches) * 100;

            this.userStats.set(userId, {
                totalGames,
                wins,
                winRate: parseFloat(winRate.toFixed(1)),
                avgScore: parseFloat(avgScore.toFixed(0)),
                maxScore,
                scoreStdDev: parseFloat(scoreStdDev.toFixed(1)),
                attendanceRate: parseFloat(attendanceRate.toFixed(1)),
                totalScore
            });
        });
    }

    // 获取用户统计数据
    getUserStats(userId) {
        return this.userStats.get(userId);
    }

    // 检查用户ID是否有效
    isValidUserId(userId) {
        return this.validUserIds.has(userId);
    }

    // 获取归一化的战力图数据（0-100范围）
    getNormalizedRadarData(userId) {
        const stats = this.getUserStats(userId);
        if (!stats) return null;

        // 获取所有用户的统计数据用于归一化
        const allStats = Array.from(this.userStats.values());
        
        const maxWinRate = Math.max(...allStats.map(s => s.winRate));
        const maxAvgScore = Math.max(...allStats.map(s => s.avgScore));
        const maxMaxScore = Math.max(...allStats.map(s => s.maxScore));
        const maxAttendance = Math.max(...allStats.map(s => s.attendanceRate));
        
            // 得分稳定性：标准差越大表示波动越大，在雷达图上应该显示为更小的值
            const minStdDev = Math.min(...allStats.map(s => s.scoreStdDev));
            const maxStdDev = Math.max(...allStats.map(s => s.scoreStdDev));

            return {
                winRate: (stats.winRate / maxWinRate) * 100,
                avgScore: (stats.avgScore / maxAvgScore) * 100,
                maxScore: (stats.maxScore / maxMaxScore) * 100,
                attendanceRate: stats.attendanceRate, // 出勤率已经是百分比
                stability: ((maxStdDev - stats.scoreStdDev) / (maxStdDev - minStdDev)) * 100
            };
    }

    // 获取用户成就
    getUserAchievements(userId) {
        const stats = this.getUserStats(userId);
        if (!stats) return [];

        const achievements = [];

        // 胜率成就
        if (stats.winRate >= 80) achievements.push({ type: 'winRate', level: 5, name: '战神', icon: '⭐' });
        else if (stats.winRate >= 60) achievements.push({ type: 'winRate', level: 4, name: '常胜将军', icon: '✨' });
        else if (stats.winRate >= 40) achievements.push({ type: 'winRate', level: 3, name: '稳健选手', icon: '🔥' });
        else if (stats.winRate >= 20) achievements.push({ type: 'winRate', level: 2, name: '拼搏者', icon: '⚡' });
        else achievements.push({ type: 'winRate', level: 1, name: '重在参与', icon: '🌱' });

        // 平均得分成就
        if (stats.avgScore >= 2000) achievements.push({ type: 'avgScore', level: 5, name: '得分王', icon: '🏆' });
        else if (stats.avgScore >= 1000) achievements.push({ type: 'avgScore', level: 4, name: '高分高手', icon: '💎' });
        else if (stats.avgScore >= 500) achievements.push({ type: 'avgScore', level: 3, name: '中坚力量', icon: '🔥' });
        else if (stats.avgScore >= 100) achievements.push({ type: 'avgScore', level: 2, name: '稳定输出', icon: '⚡' });
        else achievements.push({ type: 'avgScore', level: 1, name: '积累中', icon: '🌱' });

        // 出勤率成就
        if (stats.attendanceRate >= 90) achievements.push({ type: 'attendance', level: 5, name: '全勤王', icon: '📅' });
        else if (stats.attendanceRate >= 70) achievements.push({ type: 'attendance', level: 4, name: '活跃之星', icon: '✨' });
        else if (stats.attendanceRate >= 50) achievements.push({ type: 'attendance', level: 3, name: '经常参与', icon: '🔄' });
        else if (stats.attendanceRate >= 30) achievements.push({ type: 'attendance', level: 2, name: '偶尔露面', icon: '👀' });
        else achievements.push({ type: 'attendance', level: 1, name: '新秀', icon: '🆕' });

        // 稳定性成就（标准差越小越好，但显示时越大表示越不稳定）
        if (stats.scoreStdDev < 300) achievements.push({ type: 'stability', level: 5, name: '稳定先生', icon: '🎯' });
        else if (stats.scoreStdDev < 600) achievements.push({ type: 'stability', level: 4, name: '表现平稳', icon: '⚖️' });
        else if (stats.scoreStdDev < 1000) achievements.push({ type: 'stability', level: 3, name: '起伏型', icon: '🎢' });
        else if (stats.scoreStdDev < 1500) achievements.push({ type: 'stability', level: 2, name: '大起大落', icon: '🌊' });
        else achievements.push({ type: 'stability', level: 1, name: '过山车', icon: '🎡' });

        // 单场最高分成就（不可叠加，只取最高级别）
        if (stats.maxScore >= 5000) achievements.push({ type: 'maxScore', level: 5, name: '纪录创造者', icon: '🏅' });
        else if (stats.maxScore >= 3000) achievements.push({ type: 'maxScore', level: 4, name: '爆发型选手', icon: '💥' });
        else if (stats.maxScore >= 1500) achievements.push({ type: 'maxScore', level: 3, name: '高光时刻', icon: '🌟' });
        else if (stats.maxScore >= 500) achievements.push({ type: 'maxScore', level: 2, name: '潜力股', icon: '📈' });
        else achievements.push({ type: 'maxScore', level: 1, name: '稳步成长', icon: '🌿' });

        return achievements;
    }
}

// 全局数据处理器实例
const dataProcessor = new DataProcessor();

// 初始化数据处理
async function initializeData() {
    try {
        const response = await fetch('game_records.csv');
        const csvText = await response.text();
        
        dataProcessor.parseCSV(csvText);
        dataProcessor.calculateUserStats();
        
        console.log('数据初始化完成，有效用户:', Array.from(dataProcessor.validUserIds));
    } catch (error) {
        console.error('数据加载失败:', error);
    }
}

// 处理登录
function handleLogin(event) {
    event.preventDefault();
    
    const playerId = document.getElementById('playerId').value.trim();
    const errorElement = document.getElementById('error-message');
    
    if (dataProcessor.isValidUserId(playerId)) {
        // 登录成功
        errorElement.style.display = 'none';
        showUserProfile(playerId);
    } else {
        // 登录失败
        errorElement.style.display = 'block';
    }
}

// 显示用户画像
function showUserProfile(userId) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // 更新用户名称
    document.getElementById('user-name').textContent = `${userId} 的用户画像`;
    
    // 显示统计数据
    const stats = dataProcessor.getUserStats(userId);
    const statsContainer = document.getElementById('stats-container');
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">总参与场次:</span>
            <span class="stat-value">${stats.totalGames} 场</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">胜率:</span>
            <span class="stat-value">${stats.winRate}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">平均得分:</span>
            <span class="stat-value">${stats.avgScore}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">单场最高分:</span>
            <span class="stat-value">${stats.maxScore}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">得分稳定性:</span>
            <span class="stat-value">${stats.scoreStdDev}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">出勤率:</span>
            <span class="stat-value">${stats.attendanceRate}%</span>
        </div>
    `;
    
    // 显示战力图
    renderRadarChart(userId);
    
    // 显示成就
    showAchievements(userId);
}

// 渲染雷达图
function renderRadarChart(userId) {
    const radarData = dataProcessor.getNormalizedRadarData(userId);
    
    const ctx = document.getElementById('radar-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['胜率', '平均得分', '单场最高分', '出勤率', '稳定性'],
            datasets: [{
                label: '用户表现',
                data: [
                    radarData.winRate,
                    radarData.avgScore, 
                    radarData.maxScore,
                    radarData.attendanceRate,
                    radarData.stability
                ],
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            scales: {
                r: {
                    angleLines: {
                        display: true
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}

// 显示成就
function showAchievements(userId) {
    const achievements = dataProcessor.getUserAchievements(userId);
    const container = document.getElementById('achievement-container');
    
    container.innerHTML = achievements.map(achievement => `
        <div class="achievement-card">
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-desc">${getAchievementDescription(achievement)}</div>
        </div>
    `).join('');
}

// 获取成就描述
function getAchievementDescription(achievement) {
    const descriptions = {
        winRate: '胜率表现',
        avgScore: '得分能力', 
        maxScore: '单场爆发',
        attendance: '参与程度',
        stability: '表现稳定性'
    };
    return descriptions[achievement.type] || '游戏成就';
}

// 页面加载时初始化数据
document.addEventListener('DOMContentLoaded', initializeData);