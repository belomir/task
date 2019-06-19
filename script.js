/* © rsa'19@nsk */

/*
   Общий принцип:
      * сортировка числового массива пузырьком
         с записью действий и номеров элементов
         в массив действий
      * пошаговая анимация по цепочке
      * вся анимация css манипуляциями классами
*/

class Demo {
   /* количество элементов массива для сортировки, границы для псевдостучайных чисел */
   constructor(amount = 10, min = 0, max = 10) {
      /* проверка поддержки браузера */
      try {
         (...[])=>{};
         document.querySelector('#supportError').style.display = 'none';
      }
      catch (error) {
         throw new Error('не поддерживаемый браузер');
         console.log(error);
      }
      /* валидация аргументов */
      if(typeof(amount)!=='number')
         throw new TypeError('количество не является числом');
      if(amount<1)
         throw new RangeError('количество меньше 1');
      if(amount>100)
         throw new RangeError('количество больше 100');
      this.amount = amount;
      
      if(typeof(min)!=='number')
         throw new TypeError('минимальная граница не является числом');
      this.min = min;
      
      if(typeof(max)!=='number')
         throw new TypeError('максимальная граница не является числом');
      this.max = max;
      
      if(min>max)
         throw new RangeError('максимальная граница больше минимальной');
      
      /* общие настройки */
      this.amount = amount;
      this.min = min;
      this.max = max;
      this.playing = false; // идёт ли анимация
      this.play = false; // непрерывное проигрывание
      this.prefix = 'cell'; // префикс для grid area
      
      /* элементы DOM */
      this.display = document.querySelector('main');
      this.current = document.querySelector('#current');
      this.caret = document.querySelector('#caret');
      this.stepButton = document.querySelector('#step');
      this.playButton = document.querySelector('#play');
      this.newButton = document.querySelector('#new');

      /*
      добавление media css style
      форматирование областей для grid layout по количеству элементов массива
      в двух вариантах: строка/столбец
      */
      let row = Array(this.amount).fill().map((e,i)=>`cell${i}`).join(' ');
      let col = Array(this.amount).fill().map((e,i)=>`cell${i}`).join("''");
      let style = document.createElement('style');
      style.textContent = `
@media (max-width: 35em) {
   main {
      grid-template-areas: '${col}';
   }
}
@media (min-width: 35em) {
   main {
      grid-template-areas: '${row}';
   }
}`;
      document.head.appendChild(style);

      /* массивы:
         values - числовые значения для определения порядка сортировки
         divs - элементов DOM для манипуляций
         chain - цепочка анимаций
      */
      /* создание DOM элементов для отображения */
      this.divs = Array(this.amount).fill().map(e=>{
         let cell = document.createElement('div');
         cell.classList.add('cell');
         // вложенный элемент нужен чтобы вразаться в противофазе создавая иллюзию движения по полукругу
         let div = document.createElement('div');
         cell.appendChild(div);
         this.display.appendChild(cell);
         return cell;
      });

      this.values = Array(this.amount).fill(0);
      
      this.new();
      
      /* обработчики кнопок */
      this.newButton.addEventListener('click', this.new.bind(this));
      this.playButton.addEventListener('click', ev=>{
         this.play ^= 1;
         Array.from(ev.currentTarget.querySelectorAll('svg')).forEach(e=>{
            e.classList.toggle('hidden');
         });
         this.stepButton.disabled ^= 1;
         if(this.play){
            this.display.scrollIntoView({block: "center", behavior: "smooth"});
            this.step();
         }
      });
      this.stepButton.addEventListener('click', this.step.bind(this));
   }
   
   
   randomNumber(min=this.min, max=this.max) { // всевдослучайное число
      return Math.round(min+(max-min)*Math.random());
   }

   getTransitionDuration(element) { // вычислить время css перехода в милисекундах
      let rawDuration = getComputedStyle(element).transitionDuration;
      return parseFloat(rawDuration) * (/ms/.test(rawDuration)?1:1000);
   }

   /* создание новых псевдослучайного набора, сброс параметров */
   new() {
      this.currentStep = 0; // анимация будет с первого шага
      if(this.play)
         this.playButton.click();
      this.play = false;
      this.playing = false;

      this.current.style.gridArea = `${this.prefix}0`;
      this.current.classList.add('hidden');
      this.caret.style.gridColumnStart = 
      this.caret.style.gridRowStart = `${this.prefix}${this.amount-2}`;
      this.caret.style.gridColumnEnd = 
      this.caret.style.gridRowEnd = 'span 2';
      this.caret.classList.add('hidden');

      this.values = this.values.map(e=>this.randomNumber());
      /* список DOM элементов по порядку … */
      this.divs.forEach((e, i)=>{
         e.querySelector('div').textContent = this.values[i];
         e.style.gridColumnStart = 
         e.style.gridRowStart = `${this.prefix}${i}`;
         e.className = 'cell'; // очистка списка классов
      });
      
      this.makeChain();
   }
   
   /* шаг анимации */
   step() {
      if(this.currentStep<this.chain.length) {// если осталось что анимировать
         if(!this.playing||this.play){
            this.playing = true;
            this.stepButton.disabled = true;
            let link = this.chain[this.currentStep++]; // следующая анимация
            /* выбор элемента анимации в зависимости от типа */
            let subject;
            switch(link.type) {
               case 'current':
               case 'placed':
                  subject = this.divs[link.subject];
                  break;
               case 'pair':
               case 'unordered':
               case 'ordered':
               case 'swap':
                  subject = [this.divs[link.subject], this.divs[link.subject+1]];
                  break;
            }
            /* старт анимации */
            let duration;
            switch(link.type) {
               case 'current': // подсветка текущего искомого
                  if(this.currentStep==1) { // на первом шаге только показать
                     this.current.classList.remove('hidden');
                  }else{ // на последующих
                     this.current.classList.add('move'); // двигать на свой размер
                     duration = this.getTransitionDuration(this.current);
                     setTimeout(()=>{ // по окончании анимации
                        this.current.classList.remove('move'); // убрать смещение (тут оно будет резкое, см. css)
                        this.current.style.gridArea = `${this.prefix}${link.subject}`; // переместить на следующую позицию
                     }, duration);
                  }
                  break;
               
               case 'placed': // элемент на месте
                  subject.classList.add('placed');
                  this.caret.classList.add('hidden');
                  duration = this.getTransitionDuration(subject);
                  break;
               
               case 'pair': // выделение текущей пары
                  if(this.caret.classList.contains('hidden')){
                     this.caret.classList.remove('hidden');
                     this.caret.style.gridColumnStart = 
                     this.caret.style.gridRowStart = `${this.prefix}${link.subject}`;
                  }else{
                     this.caret.classList.add('move');
                  }
                  this.caret.classList.remove('ordered', 'unordered');
                  duration = this.getTransitionDuration(this.caret);
                  setTimeout(()=>{
                     this.caret.classList.remove('move');
                     this.caret.style.gridColumnStart = 
                     this.caret.style.gridRowStart = `${this.prefix}${link.subject}`;
                  }, duration);
                  break;
               
               case 'unordered': // пара не упорядочена
                  this.caret.classList.add('unordered');
                  this.caret.classList.remove('ordered');
                  duration = this.getTransitionDuration(this.caret);
                  break;
               
               case 'ordered': // пара упорядочена
                  this.caret.classList.remove('unordered');
                  this.caret.classList.add('ordered');
                  duration = this.getTransitionDuration(this.caret);
                  break;
               
               case 'swap': // пара меняется
                  subject.forEach(e=>{
                     e.style.gridColumnStart = 
                     e.style.gridRowStart = `${this.prefix}${link.subject}`;
                     e.classList.add('pair');
                  });
                  subject.forEach(e=>{
                     e.classList.add('swap');
                  });
                  this.caret.classList.remove('unordered');
                  this.caret.classList.add('ordered');
                  duration = Math.max(...subject.map(e=>this.getTransitionDuration(e)));
                  setTimeout(()=>{
                     subject.forEach(e=>{
                        e.classList.remove('swap', 'pair');
                     });
                     subject[0].style.gridColumnStart = 
                     subject[0].style.gridRowStart = `${this.prefix}${link.subject+1}`;
                     subject[1].style.gridColumnStart = 
                     subject[1].style.gridRowStart = `${this.prefix}${link.subject}`;
                  }, duration);
                  [this.divs[link.subject], this.divs[link.subject+1]] = 
                  [this.divs[link.subject+1], this.divs[link.subject]];
                  break;
            }
            /* после старта анимации задержка на время анимации */
            setTimeout(()=>{
               this.playing = false;
               if(this.play)
                  this.step();
               else
                  this.stepButton.disabled = false;
            }, duration);
         }
      }else{
         /* всё на месте */
         this.divs.forEach(e=>{
            e.classList.remove('placed');
         });
         this.caret.classList.add('hidden');
         this.current.classList.add('hidden');
         if(this.play)
            this.playButton.click();
      }
   }
   
   /*
      построение цепочки анимаций
      возможные значения:
         current - выделить текущее место массива, куда всплывёт пузырёк
         pair - выделить текущую пару
         unordered - пара не упорядочена
         ordered - пара упорядочена
         swap - поменять пару местами
         placed - элемент на своём месте
   */
   makeChain() {
      this.chain = [];
      for(let i=0; i<this.amount-1; i++) {
         this.chain.push({type: 'current', subject: i});
         for(let j=this.amount-2; j>=i; j--) {
            this.chain.push({type: 'pair', subject: j});
            if(this.values[j] > this.values[j+1]) {
               this.chain.push({type: 'unordered', subject: j});
               let t = this.values[j];
               this.values[j] = this.values[j+1];
               this.values[j+1] = t;
               this.chain.push({type: 'swap', subject: j});
            }else{
               this.chain.push({type: 'ordered', subject: j});
            }
         }
         this.chain.push({type: 'placed', subject: i});
      }
   }
}


var demo = new Demo();