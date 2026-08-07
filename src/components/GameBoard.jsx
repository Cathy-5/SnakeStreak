import '../App.css'
import Snake from './Snake'
import Food from './Food'

export default function GameBoard(){
    const segments = [
        [5, 5],
        [4, 5],
        [3, 5],
    ];

    const food = [
        [10, 8],
    ];

    return (
        <div>
            <h2>Game board</h2>
            <div className="gameboard">
                <Snake segments={segments}/>
                <Food food={food}/>
            </div>
        </div>
    )
}
