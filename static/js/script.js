var rol = 0
let ans = new Array(0)
var done = false
var words = ""
// 成功、失敗音效
const success = new Audio('/static/sound/correct.mp3');
const wrong = new Audio('/static/sound/wrong.mp3');
// 新增方框6rol*5col
function newbox(father , i , j , text=""){
    const box = document.createElement("div")
    box.className = "box"
    box.id = `box${i}${j}`
    box.textContent = text
    father.appendChild(box)
}
// 初始化
function setup(){
    words = dictionary[Math.floor(Math.random() * dictionary.length)].toUpperCase()
    console.log(words)
    const grid = document.getElementsByClassName("grid")[0]
    for (var i = 0; i < 6; i++){
        for (var j = 0; j < 5; j++){
            newbox(grid , i , j)
        }
    }
}
// 判斷是否為文字
function isword(word){
    return dictionary.includes(word.toLowerCase())
}
// 當虛擬or實體鍵盤被按下
function btn_click(btn , realkeybooard = false){
    if (done) return
    
    if (realkeybooard){
        var key = btn
    }
    else{
        var key = btn.value
    }
    
    if (key == "↵"){
        if (ans.length == 5){
            if (isword(ans[0]+ans[1]+ans[2]+ans[3]+ans[4])){
                const word = [words[0] , words[1] , words[2] , words[3] , words[4]]
                var tf = 0
                for (var i = 0; i < 5; i++){
                    const box = document.getElementById(`box${rol}${i}`)
                    if (ans[i] === word[i]){
                        change_keyboard_color(ans[i] , 1)
                        setTimeout(()=>{
                            box.classList.add("correct")
                        },((i + 1)*500)/2)
                        tf++
                    }
                    else if (word.includes(ans[i])){
                        change_keyboard_color(ans[i] , 2)
                        setTimeout(()=>{
                            box.classList.add("wrong")
                        },((i + 1)*500)/2)
                    }
                    else{
                        change_keyboard_color(ans[i] , 3)
                        setTimeout(()=>{
                            box.classList.add("empty")
                        },((i + 1)*500)/2)
                    }

                    box.classList.add("animated")
                    box.style.animationDelay = `${i * 500/2}ms`
                }
                rol++
                while(ans.length != 0){
                    ans.pop()
                }
                if (tf == 5){
                    done = true
                    success.play()
                    setTimeout(()=>{
                        alert("恭喜答對 !!")
                        window.location.reload();
                    }, 1500)
                }
                else{
                    wrong.play()
                    if(rol==6){
                        setTimeout(()=>{
                            alert(`哭哭，正確答案是 ${words}`)
                            window.location.reload();
                        }, 1500)
                    }
                }
            }
            else{
                wrong.play()
                alert("該單字不存在")
            }
        }
        else{
            wrong.play()
            alert("請輸入五個字母")
        }
    }
    else if (key == "←"){
        if (ans.length > 0){
            ans.pop()
            update_box()
        }
    }
    else{
        if (ans.length < 5){
            ans.push(key)
            update_box()
        }
    }
}
// 更新box狀態
function update_box(){
    for (var i = 0; i < ans.length; i++){
        document.getElementById(`box${rol}${i}`).textContent = ans[i]
    }
    for (var i = ans.length; i < 5; i++){
        document.getElementById(`box${rol}${i}`).textContent = ""
    }
}
// 變換虛擬鍵盤顏色
function change_keyboard_color(id , color){
    var txt;
    if (color == 1){
        txt = "rgb(8, 113, 8)"
    }
    else if (color == 2){
        txt = "rgb(210, 210, 44)"
    }
    else{
        txt = "rgb(52, 47, 47)"
    }
    
    var btn = document.getElementById(id)
    if (btn.style.backgroundColor == "rgb(8, 113, 8)"){
        return
    }
    btn.style.backgroundColor = txt
}
// 當按下實體鍵盤
function keyboard_event(e){
    if (e.code == "Backspace"){
        btn_click("←" , true)
    }
    else if (e.code == "Enter" || e.code == "NumpadEnter") {
        btn_click("↵" , true)
    }
    else if ("KeyA" <= e.code && e.code <= "KeyZ"){
        btn_click(e.code[3] , true)
    }
}
// 實體鍵盤監聽
document.body.addEventListener("keyup" , keyboard_event)
// 答案會印在console.log
setup();