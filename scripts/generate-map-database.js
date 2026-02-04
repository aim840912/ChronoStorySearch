/**
 * ChronoStory Map and Monster Database Generator
 *
 * 從 Google Sheets 提取的原始資料轉換為結構化的 JSON 和 XML 格式
 */

const fs = require('fs');
const path = require('path');

// 原始資料（從 Playwright 提取）
const rawData = {
  "Landing Page": [
    ["1","","","","","","","","","","","","","","","","","",""],
    ["2","","For ChronoStoryCreated by helloshortyPM me in Discord (helloshorty) to request modifications or supplement missing informationSpecial thanks to @asteriskos for mapping out Maple IslandUse your browser's search function to find a specific map or monster (Ctrl-F for Windows users, idk what for other operating systems)Map Links that are paired (e.g. A1 - A1) indicate bi-directional portals, while individual links refer to one-way portalsMap Links that start with M refer to portals that transition you to another townAdded images to find Hidden Streets more easily. PM me if you cannot find it"],
    ["39","",{"text":"ChronoStory (MSW)","href":"https://maplestoryworlds.nexon.com/play/6697fa1ed9cd4de7bea6daffed99a637"}],
    ["40","",{"text":"Discord","href":"https://discord.gg/Erkv7vSNZg"}],
    ["41","",{"text":"Gacha Drop List","href":"https://docs.google.com/spreadsheets/d/e/2PACX-1vR_xZXUXsjc7kiktd4aAcNrvawk5sodq4gRxmz7Vt5gCK4xqwcHhPVHr1YJ57cUpnn0-trzKuEEFzyW/pubhtml"}],
    ["42","",{"text":"Skill Changes","href":"https://docs.google.com/spreadsheets/d/e/2PACX-1vQbiXUm7I36S4JtWrnja8GzlYmfa-PFMd-gXZOA9t16o6IFlG8K1gn6WvWh1-I2QHHdz7-46zRy7_8R/pubhtml"}],
    ["43","",{"text":"Mob Drop Table (Public)","href":"https://docs.google.com/spreadsheets/d/e/2PACX-1vQwdsFFDzUkqYoVI4DmOOGlUbDZDwSI2k2ENe7Hvk8Z77Dls-Gt5PP08JwJlRolFqlIiJVtQDaMGrxX/pubhtml"}],
    ["44","",{"text":"Kinslay's Drop Table Website","href":"https://chrono-story.vercel.app/"}]
  ],
  "Maple Island": [
    ["1","Map Name","NPC","Monster","Monster Level","Base XP","Map Links","","Map Name","NPC","Monster","Monster Level","Base XP","Map Links"],
    ["2","Maple Road - Mushroom Town (A)"],
    ["4","West Entrance to Mushroom Town","Heena","-","A1"],
    ["5","","Sera"],
    ["6","","Chronostory Administrator"],
    ["9","Mushroom Town 1","Roger","-","A1","","","","","","",""],
    ["10","","","","","","A2"],
    ["12","Mushroom Town 2","Nina","-","A2","","Mushroom Town Townstreet","Sen","-","A3"],
    ["13","","","","","","A3"],
    ["14","","","","","","A4"],
    ["16","East Entrance to Mushroom Town","Todd","Tutorial Jr. Sentinel","#N/A","#N/A","A4"],
    ["17","","Peter","","","","A5"],
    ["20","Snail Hunting Ground I","Robin","Snail","1","3","A5"],
    ["21","","Sam","","","","A6"],
    ["24","Snail Hunting Ground II","-","Snail","1","3","A6"],
    ["25","","","Blue Snail","2","4","A7"],
    ["28","Snail Hunting Ground III","-","Snail","1","3","A7"],
    ["29","","","Blue Snail","2","4","A8"],
    ["30","","","Red Snail","4","8"],
    ["33","A Split Road","Maria","Snail","1","3","A8"],
    ["34","","","Blue Snail","2","4","A9"],
    ["35","","","Shroom","2","5","A10"],
    ["36","","","Red Snail","4","8"],
    ["39","The Field West of Amherst","-","Blue Snail","2","4","A9","","Mushroom Garden","-","Shroom","2","5","A11"],
    ["40","","","Shroom","2","5","A11"],
    ["41","","","","","","A12","","Snail Garden","-","Snail","1","3","A12"],
    ["42","","","","","","A13","","","","Blue Snail","2","4"],
    ["43","","","","","","","","","","Red Snail","4","8"],
    ["45","Rainbow Street - Amherst (B)"],
    ["47","Amherst","Rain","Amherst Crate","-","A13","","Amherst Weapon Store","Sid","","","","B1"],
    ["48","","Pio","","","","B1"],
    ["49","","Lucas","","","","B2","","Amherst Department Store","Lucy","","","","B2"],
    ["50","","","","","","B3"],
    ["51","","","","","","B4","","Amherst Townstreet","-","Amherst Crate","","","B3"],
    ["52","","","","","","B5","","","","","","","B3a"],
    ["54","","","","","","","","Snail Field of Flowers","-","Snail","1","3","B3a"],
    ["55","","","","","","","","","","Blue Snail","2","4"],
    ["56","","","","","","","","","","Red Snail","4","8"],
    ["57","","","","","","","","","","Chunky Snail","#N/A","#N/A"],
    ["59","The Field East of Amherst","Mai","Red Snail","4","8","B5","","Tomato Field","-","Ribbon Pig","10","20","B6"],
    ["60","","","Stump","4","8","B6","","","","Alpha Ribbon Pig","#N/A","#N/A"],
    ["61","","","Slime","6","10","B7"],
    ["62","","","Pig","7","15","B8","","Hunting Ground Middle of the Forest I","-","Pig","7","15","B7"],
    ["63","","","Ribbon Pig","10","20"],
    ["64","","","","","","","","Hunting Ground Middle of the Forest II","-","Slime","6","10","B8"],
    ["67","Maple Road - Southperry (C)"],
    ["69","The Field West of Southperry","-","Red Snail","4","8","A10","","In A Small Forest","-","Stump","4","8","C1"],
    ["70","","","Stump","4","8","C1","","","","Green Mushroom","15","26"],
    ["71","","","Orange Mushroom","8","15","C2"],
    ["72","","","Green Mushroom","15","26","C3","","Dangerous Forest","-","Shroom","2","5","C2"],
    ["73","","","","","","","","","","Orange Mushroom","8","15"],
    ["75","Southperry","Biggs","-","C3","","Southperry Armor Store","Pan","-","C4"],
    ["76","","Shanks","","","","C4"],
    ["77","","","","","","C5","","Pirate's Hideout","-","Southperry Pirate Lord","#N/A","#N/A","C5"],
    ["78","","","","","",{"text":"M0 (To Lith Harbor)","href":"#"}]
  ],
  "Lith Harbor": [
    ["1","Map Name","NPC","Monster","Monster Level","Base XP","Map Links","","Map Name","NPC","Monster","Monster Level","Base XP","Map Links"],
    ["2","Victoria Road - Lith Harbor (A)"],
    ["4","Lith Harbor","Teo","-","A1","","Lith Harbor Department Store","Mina","-","A1"],
    ["5","","Phil (C)","","","","A2"],
    ["6","","Jane","","","","A3","","Lith Harbor Armor Store","Natasha","-","A2"],
    ["7","","Vikin","","","","A4"],
    ["8","","Chef"],
    ["9","","Cody"],
    ["10","","Pason"],
    ["11","","Spinel"],
    ["12","","John"],
    ["13","","VIP Cab"],
    ["14","","Jean"],
    ["15","","Mr. Goldstein"],
    ["16","","Olaf"],
    ["17","","Chronostory Administrator"],
    ["18","","Duey"],
    ["19","","Mr. Kim (S)"],
    ["21","Victoria Road - Lith Harbor East (B)"],
    ["23","Right Around Lith Harbor","-","Snail","1","3","A4","","","","","","","","","","","",""],
    ["24","","","Blue Snail","2","4","B1"],
    ["25","","","Red Snail","4","8"],
    ["28","Thicket Around the Beach I","-","Snail","1","3","B1"],
    ["29","","","","","","B2"],
    ["31","Thicket Around the Beach II","-","Blue Snail","2","4","B2"],
    ["32","","","Ribbon Pig","10","20","B3"],
    ["35","Thicket Around the Beach III","-","Red Snail","4","8","B3"],
    ["36","","","Mano","20","120","B4"],
    ["39","3-Way Road-Split","-","Shroom","2","5","B4","","Hidden Street - Beach Hunting Ground","-","Red Snail","4","8","B5"],
    ["40","","","Slime","6","10","B5","","","","Lorang","37","80"],
    ["41","","","Red Snail","4","8","B6","","","","Clang","48","128"],
    ["42","","","Orange Mushroom","8","15",{"text":"M1 (To Kerning City)","href":"#"}],
    ["43","","","Pig","7","15",{"text":"M2 (To Henesys)","href":"#"},"","Hidden Street - The Pig Beach","-","Pig","7","15","B6"],
    ["44","","","Ribbon Pig","10","20","","","","","Ribbon Pig","10","20"],
    ["45","","","Lorang","37","80","","","","","Iron Hog","42","99"]
  ],
  "Kerning City": [
    ["1","Map Name","NPC","Monster","Monster Level","Base XP","Map Links","","Map Name","NPC","Monster","Monster Level","Base XP","Map Links"],
    ["2","Victoria Road - Kerning City (A)"],
    ["4","Kerning City","Regular Cab","-","A1","","Kerning City Self-Defence Item Store","Cutthroat Manny","-","A1"],
    ["5","","Mong from Kong","","","","A2","","","Don Hwang"],
    ["6","","Alex","","","","A3"],
    ["7","","Mr. Pickall","","","","A4","","Kerning City Pharmacy","Dr. Faymus","-","A2"],
    ["8","","Spinel","","","","A5"],
    ["9","","Shumi","","","","A6","","Naora Hospital","Jane Doe","-","A3"],
    ["10","","Cody","","","","A7"],
    ["11","","Nella","","","","A8","","Kerning City Repair Shop","Chris","-","A4"],
    ["12","","JM From tha Streetz","","","","A9"],
    ["13","","Icarus","","","","","","Thieves' Hideout","Dark Lord","-","A5"],
    ["14","","Gachapon"],
    ["15","","Lakelis"],
    ["16","","Duey"],
    ["17","","Mr. Hong"],
    ["21","Victoria Road - Kerning City Subway (B)"],
    ["23","Subway Ticketing Booth - Victoria Road","Jake","-","A6"],
    ["24","","","The Ticket Gate","","","B1"],
    ["27","Line 1 <Area 1> - Kerning City Subway","-","Bubbling","15","26","B1"],
    ["28","","","","","","B2"],
    ["30","Transfer Area","-","Stirge","20","33","B2","","Line 1 <Area 2>","-","Crimson Stirge","26","66","B3"],
    ["31","","","","","","B3","","","","","","","B3a"],
    ["32","","","","","","B4"],
    ["33","","","","","","","","Line 1 <Area 3>","-","Jr. Wraith","35","70","B3a"],
    ["34","","","","","","","","","","","","","B3b"],
    ["36","","","","","","","","Line 1 <Area 4>","-","Wraith","48","120","B3b"],
    ["37","","","","","","","","","","Shade","56","180"],
    ["39","","","","","","","","Line 2 <Area 1>","-","Jr. Wraith","35","70","B4"],
    ["40","","","","","","","","","","","","","B4a"],
    ["42","","","","","","","","Line 2 <Area 2>","-","Wraith","48","120","B4a"],
    ["43","","","","","","","","","","","","","B4b"],
    ["45","","","","","","","","Line 2 <Area 3>","-","Miner Zombie","57","190","B4b"],
    ["48","Victoria Road - Kerning City East (C)"],
    ["50","Sunset Sky","-","Blue Snail","2","4","A7"],
    ["51","","","Stump","4","8","C1"],
    ["52","","","Octopus","12","24"],
    ["53","","","Green Mushroom","15","26"],
    ["56","Construction Site North of Kerning City","Thief Job Instructor","Stump","4","8","C1","","Hidden Street - Northern Top of Construction Site","-","Octopus","12","24","C2"],
    ["57","","","Orange Mushroom","8","15","C2"],
    ["58","","","Axe Stump","17","30",{"text":"M3 (To Perion)","href":"#"}],
    ["60","Warning Street - Kerning City Swamp (D)"],
    ["62","The Swamp of Despair I","-","Jr. Necki","21","38","A8","","Hidden Street - Swamp of the Jr. Necki","-","Jr. Necki","21","38","D1"],
    ["63","","","Ligator","32","60","D1"],
    ["64","","","","","","D2"],
    ["66","The Swamp of Despair II","Tulcus","Jr. Necki","21","38","D2"],
    ["67","","","Ligator","32","60","D3"],
    ["70","The Swamp of Despair III","-","Jr. Necki","21","38","D3"],
    ["71","","","Ligator","32","60","D4"],
    ["72","","","Croco","52","170"],
    ["75","Dangerous Croco I","-","Croco","52","170","D4"],
    ["76","","","Dyle","65","810","D5"],
    ["79","Dangerous Croco II","-","Jr. Necki","21","38","D5","","Hidden Street - Monkey Swamp I","-","Lupin","37","77","D6"],
    ["80","","","Clang","48","128","D6"],
    ["81","","","Croco","52","170",{"text":"M7 (To Sleepywood)","href":"#"}],
    ["82","","","Lupin","37","77","","","Hidden Street - Monkey Swamp II","Door of Dimension","Lupin","37","77","D6a"],
    ["83","","","","","","","","","","Zombie Lupin","40","90","D6b"],
    ["85","","","","","","","","Hidden Street - Monkey Swamp III","-","Zombie Lupin","40","90","D6b"],
    ["87","Victoria Road - Kerning City West (E)"],
    ["89","Kerning City Construction Site","Chun Ji","Stump","4","8","A9","","Hidden Street - Caution Falling Down","-","Octopus","12","24","E1"],
    ["90","","","Orange Mushroom","8","15","E1"],
    ["91","","","Octopus","12","24","E2"],
    ["94","L Forest I","-","Slime","6","10","E2"],
    ["95","","","Orange Mushroom","8","15","E3"],
    ["96","","","Iron Hog","42","99"],
    ["97","","","Green Mushroom","15","26"],
    ["100","L Forest II","-","Slime","6","10","E3"],
    ["101","","","Orange Mushroom","8","15","E4"],
    ["102","","","Iron Hog","42","99"],
    ["103","","","Green Mushroom","15","26"],
    ["106","L Forest III","-","Orange Mushroom","8","15","E4"],
    ["107","","","Iron Hog","42","99","E5"],
    ["108","","","Green Mushroom","15","26"],
    ["109","","","Horny Mushroom","22","35"],
    ["112","Kerning City Middle Forest I","-","Orange Mushroom","8","15","E5","","Kerning City Middle Forest II","-","Blue Mushroom","20","32","E6"],
    ["113","","","Blue Mushroom","20","32","E6","","","","Horny Mushroom","22","35","E6a"],
    ["114","","","Horny Mushroom","22","35",{"text":"M1 (To Lith Harbor)","href":"#"},"","","","Iron Hog","42","99"],
    ["117","","","","","","","","Kerning City Middle Forest III","-","Iron Hog","42","99","E6a"]
  ],
  "Reference": [
    ["1","Name","Level","Base XP","HP"],
    ["2","Snail","1","3",""],
    ["3","Blue Snail","2","4",""],
    ["4","Shroom","2","5",""],
    ["5","Red Snail","4","8",""],
    ["6","Stump","4","8",""],
    ["7","Slime","6","10",""],
    ["8","Pig","7","15",""],
    ["9","Orange Mushroom","8","15",""],
    ["10","Ribbon Pig","10","20",""],
    ["11","Dark Stump","10","18",""],
    ["12","Octopus","12","24",""],
    ["13","Green Mushroom","15","26",""],
    ["14","Bubbling","15","26",""],
    ["15","Axe Stump","17","30",""],
    ["16","Ghost Stump","19","33",""],
    ["17","Blue Mushroom","20","32",""],
    ["18","Stirge","20","33",""],
    ["19","Jr. Necki","21","38",""],
    ["20","Horny Mushroom","22","35",""],
    ["21","Dark Axe Stump","22","38",""],
    ["22","Wooden Mask","23","42",""],
    ["23","Zombie Mushroom","24","42",""],
    ["24","Rocky Mask","24","45",""],
    ["25","Wild Boar","25","42",""],
    ["26","Crimson Stirge","26","66",""],
    ["27","Evil Eye","27","50",""],
    ["28","Fairy","30","120",""],
    ["29","Fire Boar","32","60",""],
    ["30","Ligator","32","60",""],
    ["31","Curse Eye","35","70",""],
    ["32","Jr. Boogie","35","150",""],
    ["33","Jr. Wraith","35","70",""],
    ["34","Lorang","37","80",""],
    ["35","Lupin","37","77",""],
    ["36","Cold Eye","40","85",""],
    ["37","Zombie Lupin","40","90",""],
    ["38","Iron Hog","42","99",""],
    ["39","Skeledog","44","107",""],
    ["40","Copper Drake","45","105",""],
    ["41","Iron Boar","45","115",""],
    ["42","Tortie","46","110",""],
    ["43","Mummydog","47","117",""],
    ["44","Wraith","48","120",""],
    ["45","Clang","48","128",""],
    ["46","Dark Eye","48","160",""],
    ["47","Drake","50","135",""],
    ["48","Croco","52","170",""],
    ["49","Stone Golem","55","170",""],
    ["50","Malady","55","170",""],
    ["51","Skeleton Soldier","57","190",""],
    ["52","Miner Zombie","57","190",""],
    ["53","Dark Stone Golem","58","200",""],
    ["54","Mixed Golem","59","210",""],
    ["55","Red Drake","60","220",""],
    ["56","Wild Kargo","62","240",""],
    ["57","Officer Skeleton","63","240",""],
    ["58","Ice Drake","64","250",""],
    ["59","Dark Drake","68","265",""],
    ["60","Hot Mixed Golem","68","275",""],
    ["61","Cold Mixed Golem","68","275",""],
    ["62","Tauromacis","70","270",""],
    ["63","Commander Skeleton","73","315",""],
    ["64","Taurospear","75","350",""],
    ["65","Tauroshield","80","1200",""],
    ["69","Mano","20","120",""],
    ["70","Stumpy","35","205",""],
    ["71","King Clang","55","1210",""],
    ["72","Shade","56","180",""],
    ["73","Faust","50","410",""],
    ["74","Mushmom","60","1200",""],
    ["75","Dyle","65","810",""],
    ["76","Zombie Mushmom","65","1500",""],
    ["77","Bob","69","1400",""],
    ["78","Jr. Balrog","80","2000",""]
  ]
};

// 處理資料的輔助函數
function parseMapData(rows, regionName) {
  const areas = [];
  let currentSection = null;
  let currentMap = null;

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const firstCell = row[1] || '';
    const secondCell = row[2] || '';

    // 檢測區域標題（如 "Victoria Road - Lith Harbor (A)"）
    if (firstCell && firstCell.includes(' - ') && firstCell.includes('(') && !secondCell) {
      currentSection = {
        name: firstCell,
        code: firstCell.match(/\(([A-Z])\)/)?.[1] || '',
        maps: []
      };
      areas.push(currentSection);
      continue;
    }

    // 檢測地圖名稱（第一欄有值，第二欄是 NPC 或 "-"）
    if (firstCell && !firstCell.includes(' - ') && currentSection) {
      // 這可能是一個新地圖或地圖的延續
      if (secondCell || row[3]) {
        // 左側地圖
        const leftMap = parseMapRow(row.slice(1, 7));
        if (leftMap.name) {
          currentSection.maps.push(leftMap);
          currentMap = leftMap;
        }

        // 右側地圖（如果存在）
        if (row.length > 8 && row[8]) {
          const rightMap = parseMapRow(row.slice(8, 14));
          if (rightMap.name) {
            currentSection.maps.push(rightMap);
          }
        }
      } else if (currentMap && row[3]) {
        // 這是當前地圖的額外怪物
        const monster = {
          name: row[3],
          level: parseInt(row[4]) || null,
          baseXP: parseInt(row[5]) || null
        };
        if (monster.name && monster.name !== '-') {
          currentMap.monsters = currentMap.monsters || [];
          currentMap.monsters.push(monster);
        }
      }
    }
  }

  return areas;
}

function parseMapRow(cells) {
  const map = {
    name: cells[0] || '',
    npcs: [],
    monsters: [],
    links: []
  };

  // NPC
  if (cells[1] && cells[1] !== '-') {
    map.npcs.push(cells[1]);
  }

  // Monster
  if (cells[2] && cells[2] !== '-') {
    map.monsters.push({
      name: cells[2],
      level: parseInt(cells[3]) || null,
      baseXP: parseInt(cells[4]) || null
    });
  }

  // Links
  if (cells[5]) {
    if (typeof cells[5] === 'object' && cells[5].text) {
      map.links.push({
        code: cells[5].text,
        type: 'town_portal'
      });
    } else {
      map.links.push({
        code: cells[5],
        type: 'local'
      });
    }
  }

  return map;
}

function parseReferenceData(rows) {
  const monsters = [];

  for (const row of rows) {
    if (!row || row.length < 4) continue;
    if (row[1] === 'Name') continue; // 跳過標題行

    const name = row[1];
    const level = parseInt(row[2]);
    const baseXP = parseInt(row[3]);

    if (name && !isNaN(level)) {
      monsters.push({
        name,
        level,
        baseXP: isNaN(baseXP) ? null : baseXP,
        hp: row[4] || null
      });
    }
  }

  return monsters;
}

function generateJSON(data) {
  const result = {
    metadata: {
      title: "ChronoStory Map and Monster Database",
      author: "helloshorty",
      extractedAt: new Date().toISOString().split('T')[0],
      source: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSIUj-72ADgwMqShxt4Dn7OP7dBN54l0wda1IPwlIVTZUN_ZtTlRx5DDidr43VXv2HYQ5RNqccLbbGS/pubhtml",
      totalSheets: 14
    },
    documentation: {
      description: "For ChronoStory - Created by helloshorty",
      notes: [
        "PM me in Discord (helloshorty) to request modifications or supplement missing information",
        "Special thanks to @asteriskos for mapping out Maple Island",
        "Map Links that are paired (e.g. A1 - A1) indicate bi-directional portals",
        "Map Links that start with M refer to portals that transition you to another town"
      ],
      links: {
        game: "https://maplestoryworlds.nexon.com/play/6697fa1ed9cd4de7bea6daffed99a637",
        discord: "https://discord.gg/Erkv7vSNZg",
        gachaDropList: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR_xZXUXsjc7kiktd4aAcNrvawk5sodq4gRxmz7Vt5gCK4xqwcHhPVHr1YJ57cUpnn0-trzKuEEFzyW/pubhtml",
        skillChanges: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQbiXUm7I36S4JtWrnja8GzlYmfa-PFMd-gXZOA9t16o6IFlG8K1gn6WvWh1-I2QHHdz7-46zRy7_8R/pubhtml",
        mobDropTable: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQwdsFFDzUkqYoVI4DmOOGlUbDZDwSI2k2ENe7Hvk8Z77Dls-Gt5PP08JwJlRolFqlIiJVtQDaMGrxX/pubhtml",
        kinslayDropTable: "https://chrono-story.vercel.app/"
      }
    },
    regions: {},
    reference: {
      monsters: parseReferenceData(data["Reference"])
    }
  };

  // 處理各區域
  const regionMapping = {
    "Maple Island": "maple_island",
    "Lith Harbor": "lith_harbor",
    "Kerning City": "kerning_city",
    "Henesys": "henesys",
    "Perion": "perion",
    "Ellinia": "ellinia",
    "Nautilus": "nautilus",
    "Sleepywood": "sleepywood",
    "Orbis": "orbis",
    "El Nath": "el_nath",
    "Ludibrium": "ludibrium",
    "Omega Sector": "omega_sector"
  };

  for (const [sheetName, regionKey] of Object.entries(regionMapping)) {
    if (data[sheetName]) {
      result.regions[regionKey] = {
        name: sheetName,
        areas: parseMapData(data[sheetName], sheetName)
      };
    }
  }

  return result;
}

function generateXML(jsonData) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<chronostory-database>\n';

  // Metadata
  xml += '  <metadata>\n';
  xml += `    <title>${escapeXml(jsonData.metadata.title)}</title>\n`;
  xml += `    <author>${escapeXml(jsonData.metadata.author)}</author>\n`;
  xml += `    <extracted-at>${jsonData.metadata.extractedAt}</extracted-at>\n`;
  xml += `    <source>${escapeXml(jsonData.metadata.source)}</source>\n`;
  xml += `    <total-sheets>${jsonData.metadata.totalSheets}</total-sheets>\n`;
  xml += '  </metadata>\n';

  // Documentation
  xml += '  <documentation>\n';
  xml += `    <description>${escapeXml(jsonData.documentation.description)}</description>\n`;
  xml += '    <notes>\n';
  for (const note of jsonData.documentation.notes) {
    xml += `      <note>${escapeXml(note)}</note>\n`;
  }
  xml += '    </notes>\n';
  xml += '    <links>\n';
  for (const [key, url] of Object.entries(jsonData.documentation.links)) {
    xml += `      <link name="${key}">${escapeXml(url)}</link>\n`;
  }
  xml += '    </links>\n';
  xml += '  </documentation>\n';

  // Regions
  xml += '  <regions>\n';
  for (const [regionKey, region] of Object.entries(jsonData.regions)) {
    xml += `    <region id="${regionKey}" name="${escapeXml(region.name)}">\n`;
    for (const area of region.areas) {
      xml += `      <area name="${escapeXml(area.name)}" code="${area.code}">\n`;
      for (const map of area.maps) {
        xml += `        <map name="${escapeXml(map.name)}">\n`;
        if (map.npcs && map.npcs.length > 0) {
          xml += '          <npcs>\n';
          for (const npc of map.npcs) {
            xml += `            <npc>${escapeXml(npc)}</npc>\n`;
          }
          xml += '          </npcs>\n';
        }
        if (map.monsters && map.monsters.length > 0) {
          xml += '          <monsters>\n';
          for (const monster of map.monsters) {
            xml += `            <monster name="${escapeXml(monster.name)}" level="${monster.level || ''}" base-xp="${monster.baseXP || ''}"/>\n`;
          }
          xml += '          </monsters>\n';
        }
        if (map.links && map.links.length > 0) {
          xml += '          <links>\n';
          for (const link of map.links) {
            xml += `            <link code="${escapeXml(link.code)}" type="${link.type}"/>\n`;
          }
          xml += '          </links>\n';
        }
        xml += '        </map>\n';
      }
      xml += '      </area>\n';
    }
    xml += '    </region>\n';
  }
  xml += '  </regions>\n';

  // Reference
  xml += '  <reference>\n';
  xml += '    <monsters>\n';
  for (const monster of jsonData.reference.monsters) {
    xml += `      <monster name="${escapeXml(monster.name)}" level="${monster.level}" base-xp="${monster.baseXP || ''}"/>\n`;
  }
  xml += '    </monsters>\n';
  xml += '  </reference>\n';

  xml += '</chronostory-database>\n';

  return xml;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 主程式
async function main() {
  console.log('Generating ChronoStory Map Database...\n');

  const jsonData = generateJSON(rawData);

  // 輸出目錄
  const outputDir = path.join(__dirname, '..', 'chronostoryData', 'map-database');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 寫入 JSON
  const jsonPath = path.join(outputDir, 'chronostory-map-database.json');
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
  console.log(`JSON saved to: ${jsonPath}`);

  // 寫入 XML
  const xmlPath = path.join(outputDir, 'chronostory-map-database.xml');
  fs.writeFileSync(xmlPath, generateXML(jsonData), 'utf-8');
  console.log(`XML saved to: ${xmlPath}`);

  // 統計
  console.log('\n--- Statistics ---');
  console.log(`Regions: ${Object.keys(jsonData.regions).length}`);
  console.log(`Reference monsters: ${jsonData.reference.monsters.length}`);

  let totalMaps = 0;
  for (const region of Object.values(jsonData.regions)) {
    for (const area of region.areas) {
      totalMaps += area.maps.length;
    }
  }
  console.log(`Total maps: ${totalMaps}`);
}

main().catch(console.error);
