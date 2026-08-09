import '../App.css'
import Snake from './Snake'
import Food from './Food'

export default function GameBoard( { segments, food } ){
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
